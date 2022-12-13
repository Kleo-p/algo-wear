from pyteal import *


class Wear:
    class AppMethods:
        buy = Bytes("buy")
        change_discount = Bytes("change_discount")
        update_stock = Bytes("update-stock")

    class Variables:
        creator = Bytes("_creator")
        name = Bytes("_name")
        description = Bytes("_description")
        amount = Bytes("_amount")
        image = Bytes("_image")
        stock = Bytes("_stock")
        discount = Bytes("_discount")

    def application_creation(self):
        return Seq([
            # check length of args
            Assert(Txn.application_args.length() == Int(6)),
            # check contract note
            Assert(Txn.note() == Bytes("wear:uv3")),
            # check that price is greater than 0
            Assert(Btoi(Txn.application_args[3]) > Int(0)),

            # intialize variables
            App.globalPut(self.Variables.creator, Txn.sender()),
            App.globalPut(self.Variables.name, Txn.application_args[0]),
            App.globalPut(self.Variables.description, Txn.application_args[1]),
            App.globalPut(self.Variables.image, Txn.application_args[2]),
            App.globalPut(self.Variables.amount,
                          Btoi(Txn.application_args[3])),
            App.globalPut(self.Variables.stock,
                          Btoi(Txn.application_args[4])),
            App.globalPut(self.Variables.discount,
                          Btoi(Txn.application_args[5])),

            Approve()
        ])

    def buy(self):
        discounted_amount = App.globalGet(
            self.Variables.amount) - App.globalGet(self.Variables.discount)
        return Seq([
            Assert(
                #use and operation
                And(
                    # check if the size of transaction is two
                    Global.group_size() == Int(2),
                    # check if the arguments passed is 1
                    Txn.application_args.length() == Int(1),
                    # check that sender is not the creator
                    # Txn.sender() != App.globalGet(self.Variables.creator),
                    # check that stock is not 0
                    App.globalGet(self.Variables.stock) > Int(0),


                    Gtxn[1].type_enum() == TxnType.Payment,
                    Gtxn[1].receiver() == App.globalGet(
                        self.Variables.creator),
                    Gtxn[1].amount() == discounted_amount,
                    Gtxn[1].sender() == Gtxn[0].sender(),
                )
            ),
            # update the stock
            App.globalPut(self.Variables.stock, App.globalGet(self.Variables.stock)- Int(1)),
            Approve()
        ])

    def change_discount(self):
        return Seq([
            Assert(
                And(
                    # check if the size of transaction is 1
                    Global.group_size() == Int(1),
                    # check if the arguments passed is 2
                    Txn.application_args.length() == Int(2),
                    # check if the sender is the creator
                    Txn.sender() == App.globalGet(self.Variables.creator),

                ),
            ),
            App.globalPut(self.Variables.discount, Btoi(Txn.application_args[1])),
            Approve()
        ])
    
    def update_stock(self):
         return Seq([
            Assert(
                And(
                    # check if the size of transaction is 1
                    Global.group_size() == Int(1),
                    # check if the arguments passed is 2
                    Txn.application_args.length() == Int(2),
                    # make sure that arg passed is greater than 0
                    Btoi(Txn.application_args[1]) > Int(0),
                    # check if the sender is the creator
                    Txn.sender() == App.globalGet(self.Variables.creator),

                ),
            ),
            App.globalPut(self.Variables.stock, Btoi(Txn.application_args[1])),
            Approve()
        ])

    def application_deletion(self):
        return Return(Txn.sender() == Global.creator_address())

    def application_start(self):
        return Cond(
            [Txn.application_id() == Int(0), self.application_creation()],
            [Txn.on_completion() == OnComplete.DeleteApplication,
             self.application_deletion()],
            [Txn.application_args[0] == self.AppMethods.buy, self.buy()],
            [Txn.application_args[0] == self.AppMethods.change_discount, self.change_discount()],
            [Txn.application_args[0] == self.AppMethods.update_stock, self.update_stock()],
        )

    def approval_program(self):
        return self.application_start()

    def clear_program(self):
        return Return(Int(1))
