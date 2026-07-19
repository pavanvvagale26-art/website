import React, { useContext } from "react";
import "../App.css";
import { CartContext } from "../context/CartContext";
import { MenuContext } from "../context/MenuContext";

function MenuItemButton({ item }) {
    const { cart, addToCart } = useContext(CartContext);
    const cartItem = cart.find((i) => i.id === item.id || i.name === item.name); // Check by id, fallback to name
    const isInCart = !!cartItem;

    if (isInCart) {
        return (
            <div className="added-cart-row">
                <span className="added-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Added
                    <span className="added-qty-badge">{cartItem.qty}</span>
                </span>
                <button
                    className="add-more-btn"
                    onClick={() => addToCart(item)}
                    title="Add one more"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </button>
            </div>
        );
    }

    return (
        <button
            className="add-btn"
            onClick={() => addToCart(item)}
        >
            Add to Cart
        </button>
    );
}

export default function Menu() {
    const { menu } = useContext(MenuContext);

    return (
        <div className="menu-page">

            <h2>🍽️ Brunch Menu (10 AM – 3 PM)</h2>
            <div className="menu-grid">
                {menu.brunch.map((item, index) => (
                    <div className="menu-card" key={item.id || index}>
                        <img src={item.img} alt={item.name} />
                        <h3>{item.name}</h3>
                        <p className="price">₹{item.price}</p>
                        <p className="desc">{item.desc}</p>
                        <MenuItemButton item={item} />
                    </div>
                ))}
            </div>

            <h2 className="menu-section-title">EVENING MENU (6 PM TO 10 PM)</h2>
            <div className="menu-grid">
                {menu.evening.map((item, index) => (
                    <div className="menu-card" key={item.id || index}>
                        <img src={item.img} alt={item.name} />
                        <h3>{item.name}</h3>
                        <p className="price">₹{item.price}</p>
                        <p className="desc">{item.desc}</p>
                        <MenuItemButton item={item} />
                    </div>
                ))}
            </div>
            <h2 className="menu-section-title">BEVERAGES</h2>
            <div className="menu-grid">
                {menu.beverages.map((item, index) => (
                    <div className="menu-card beverages-card" key={item.id || index}>
                        <img src={item.img} alt={item.name} className="beverage-img" />
                        <h3>{item.name}</h3>
                        <p className="price">₹{item.price}</p>
                        <MenuItemButton item={item} />
                    </div>
                ))}
            </div>

        </div>
    );
}
