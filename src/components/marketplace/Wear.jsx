import React, {useState} from "react";
import PropTypes from "prop-types";
import {Badge, Button, Card, Col, FloatingLabel, Form, Stack} from "react-bootstrap";
import {microAlgosToString, stringToMicroAlgos, truncateAddress} from "../../utils/conversions";
import Identicon from "../utils/Identicon";

const Wear = ({address, wear, buyWear, changeDiscount, updateStock}) => {
    const {name, image, description, amount, stock, discount, appId, owner} =
        wear;

    const [quantity, setQuantity] = useState(1)
    const [_discount, set_discount] = useState(1);

    return (
        <Col key={appId}>
            <Card className="h-100">
                <Card.Header>
                    <Stack direction="horizontal" gap={2}>
                        <span className="font-monospace text-secondary">{truncateAddress(owner)}</span>
                        <Identicon size={28} address={owner}/>
                        <Badge bg="secondary" className="ms-auto">
                            {stock} stock
                        </Badge>
                        <Badge bg="secondary" className="ms-auto">
                            {microAlgosToString(discount)} discount
                        </Badge>
                    </Stack>
                </Card.Header>
                <div className="ratio ratio-4x3">
                    <img src={image} alt={name} style={{objectFit: "cover"}}/>
                </div>
                <Card.Body className="d-flex flex-column text-center">
                    <Card.Title>{name}</Card.Title>
                    <Card.Text className="flex-grow-1">{description}</Card.Text>
                    <Form className="d-flex   gap-2">
                        {wear.owner === address &&<FloatingLabel
                            controlId="inputCount"
                            label="Stock"
                            className="w-25"
                        >
                            <Form.Control
                                type="number"
                                value={quantity}
                                min="1"
                                max="10"
                                onChange={(e) => {
                                    setQuantity(Number(e.target.value));
                                }}
                            />
                            <Button
                                variant="outline-danger"
                                onClick={() => updateStock(wear, quantity)}
                                className="btn"
                            >
                                Edit Stock
                            </Button>
                        </FloatingLabel>}
                        {stock > 0 ? <Button
                            variant="outline-dark"
                            onClick={() => buyWear(wear)}
                            className="w-75 py-3"
                        >
                            Buy Here Price({microAlgosToString(amount)})ALGO 
                        </Button>: <p>Out of stock. Contact owner</p>}
                        {wear.owner === address &&
                       
                        <FloatingLabel
                            controlId="inputCount"
                            label="Discount"
                            className="w-25"
                        >
                            <Form.Control
                                type="number"
                                value={_discount}
                                min="1"
                                max="10"
                                onChange={(e) => {
                                    set_discount(e.target.value);
                                }}
                            />
                                <Button
                                variant="outline-danger"
                                onClick={() => changeDiscount(wear, stringToMicroAlgos(_discount))}
                                className="btn"
                            >
                                Change Discount
                            </Button>
                        
                        </FloatingLabel>
                    
                           
                        }
                    </Form>
                </Card.Body>
            </Card>
        </Col>
    );
};

Wear.propTypes = {
    address: PropTypes.string.isRequired,
    wear: PropTypes.instanceOf(Object).isRequired,
    buyWear: PropTypes.func.isRequired,
    changeDiscount: PropTypes.func.isRequired,
    updateStock: PropTypes.func.isRequired
};

export default Wear;
