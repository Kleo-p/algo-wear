import React, {useEffect, useState} from "react";
import {toast} from "react-toastify";
import AddWear from "./AddWear";
import Wear from "./Wear";
import Loader from "../utils/Loader";
import {NotificationError, NotificationSuccess} from "../utils/Notifications";
import {createWearAction, buyWearAction, changeDiscountAction, updateStockAction, getWearsAction} from "../../utils/marketplace";
import PropTypes from "prop-types";
import {Row} from "react-bootstrap";

const Wears = ({address, fetchBalance}) => {
    const [wears, setWears] = useState([]);
    const [loading, setLoading] = useState(false);

    const getWears = async () => {
        setLoading(true);
        getWearsAction()
            .then(wears => {
                if (wears) {
                    setWears(wears);
                }
            })
            .catch(error => {
                console.log(error);
            })
            .finally(_ => {
                setLoading(false);
            });
    };

    useEffect(() => {
        getWears();
    }, []);

    const createWear = async (data) => {
        setLoading(true);
        createWearAction(address, data)
            .then(() => {
                toast(<NotificationSuccess text="Wear added successfully."/>);
                getWears();
                fetchBalance(address);
            })
            .catch(error => {
                console.log(error);
                toast(<NotificationError text="Failed to create a wear."/>);
                setLoading(false);
            })
    };

    const buyWear = async (wear) => {
        setLoading(true);
        buyWearAction(address, wear)
            .then(() => {
                toast(<NotificationSuccess text="Wear bought successfully"/>);
                getWears();
                fetchBalance(address);
            })
            .catch(error => {
                console.log(error)
                toast(<NotificationError text="Failed to purchase wear."/>);
                setLoading(false);
            })
    };

    const changeDiscount = async (wear, discount) => {
        setLoading(true);
        if(wear.amount < discount){
            toast(<NotificationError text="Discount amount needs to be less than the price."/>);
            setLoading(false)
            return;
        }
        changeDiscountAction(address, wear, discount)
            .then(() => {
                toast(<NotificationSuccess text="Discount changed successfully"/>);
                getWears();
                fetchBalance(address);
            })
            .catch(error => {
                console.log(error)
                toast(<NotificationError text="Failed to change discount."/>);
                setLoading(false);
            })
    };

    const updateStock = async (wear, stock) => {
        setLoading(true);
        updateStockAction(address, wear, stock)
            .then(() => {
                toast(<NotificationSuccess text="Stock updated successfully"/>);
                getWears();
                fetchBalance(address);
            })
            .catch(error => {
                console.log(error)
                toast(<NotificationError text="Failed to update stock."/>);
                setLoading(false);
            })
    };


    if (loading) {
        return <Loader/>;
    }
    return (
        <>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="fs-4 fw-bold mb-0">Algo Wear</h1>
                <AddWear createWear={createWear}/>
            </div>
            <Row xs={1} sm={2} lg={3} className="g-3 mb-5 g-xl-4 g-xxl-5">
                <>
                    {wears.map((wear, index) => (
                        <Wear
                            address={address}
                            wear={wear}
                            buyWear={buyWear}
                            updateStock = {updateStock}
                            changeDiscount = {changeDiscount}
                            key={index}
                        />
                    ))}
                </>
            </Row>
        </>
    );
};

Wears.propTypes = {
    address: PropTypes.string.isRequired,
    fetchBalance: PropTypes.func.isRequired
};

export default Wears;
