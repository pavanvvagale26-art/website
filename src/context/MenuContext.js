import React, { createContext, useState, useEffect } from "react";

export const MenuContext = createContext();

const initialMenu = {
  brunch: [
    {
      id: "b1",
      name: "Chicken Palav",
      price: 180,
      desc: "[3 Pieces]. SGS signature Chicken Palav served with half egg, onion cucumber salad, and lime.",
      img: "/menu/chicken-palav.jpg"
    },
    {
      id: "b2",
      name: "Mutton Palav",
      price: 220,
      desc: "Served with three tender mutton pieces, half-boiled egg, fresh onion and cucumber salad, and a slice of lime for added flavor.",
      img: "/menu/mutton.jpg"
    },
    {
      id: "b3",
      name: "Plain Palav",
      price: 150,
      desc: "Served with half egg, onion cucumber salad, and lime.",
      img: "/menu/plain-palav.jpg"
    },
    {
      id: "b4",
      name: "Extra Chicken Pieces",
      price: 120,
      desc: "3 pieces with lemon & onion.",
      img: "/menu/extra.jpg"
    },
    {
      id: "b5",
      name: "Extra Boiled Egg",
      price: 35,
      desc: "Fresh half boiled egg.",
      img: "/menu/egg.jpg"
    }
  ],
  evening: [
    {
      id: "e1",
      name: "Chicken Kshatriya (5 pcs)",
      price: 270,
      desc: "Spicy special chicken preparation.",
      img: "/menu/kshatriya.jpg"
    },
    {
      id: "e2",
      name: "Chicken Kabab (5 pcs)",
      price: 240,
      desc: "Authentic south Indian kabab, marinated with tender spices and permitted ingredients, Master piece of gundu pulav.",
      img: "/menu/sgs-chicken-kebab.jpg"
    },
    {
      id: "e3",
      name: "Chilly Chicken (5 pcs)",
      price: 260,
      desc: "Special chilly chicken.",
      img: "/menu/chilly.jpg"
    },
    {
      id: "e4",
      name: "Pepper Chicken (5 pcs)",
      price: 250,
      desc: "Spicy pepper chicken pieces.",
      img: "/menu/pep.jpg"
    },
    {
      id: "e5",
      name: "Kabab Donne Palav",
      price: 299,
      desc: "Plain palav/biriyani rice served with juicy kebab [3 pieces], half egg, lime and raita.",
      img: "/menu/kabab-donne-palav.jpg"
    },
    {
      id: "e6",
      name: "Kshatriya Donne Palav",
      price: 329,
      desc: "Plain pulao/biryani rice served with juicy Kshatriya kebab [3 pieces], half egg, lime and raita.",
      img: "/menu/kshatriya-donne-palav-combo.jpg"
    },
    {
      id: "e7",
      name: "Pepper Chicken Donne Palav",
      price: 320,
      desc: "Pepper chicken with donne palav.",
      img: "/menu/pepper.jpg"
    }
  ],
  beverages: [
    { id: "bev1", name: "Coke (200 ml)", price: 40, img: "/menu/coke.jpg" },
    { id: "bev2", name: "Limca (200 ml)", price: 40, img: "/menu/limca.jpg" },
    { id: "bev3", name: "Sprite (200 ml)", price: 40, img: "/menu/sprite.jpg" },
    { id: "bev4", name: "Thums Up (200 ml)", price: 40, img: "/menu/thumbs.jpg" },
    { id: "bev5", name: "Mineral Water (1 Litre)", price: 25, img: "/menu/water.jpg" }
  ]
};

export function MenuProvider({ children }) {
  // Try loading from localStorage first, else fallback to initialMenu
  const [menu, setMenu] = useState(() => {
    const savedMenu = localStorage.getItem("sgs_menu");
    if (savedMenu) {
      return JSON.parse(savedMenu);
    }
    return initialMenu;
  });

  // Whenever menu state changes, update localStorage
  useEffect(() => {
    localStorage.setItem("sgs_menu", JSON.stringify(menu));
  }, [menu]);

  const addProduct = (category, product) => {
    setMenu((prevMenu) => {
      // Create new ID
      const newProduct = { ...product, id: Date.now().toString() };
      return {
        ...prevMenu,
        [category]: [...prevMenu[category], newProduct],
      };
    });
  };

  const removeProduct = (category, id) => {
    setMenu((prevMenu) => ({
      ...prevMenu,
      [category]: prevMenu[category].filter((item) => item.id !== id),
    }));
  };

  const editProduct = (category, id, updatedFields) => {
    setMenu((prevMenu) => ({
      ...prevMenu,
      [category]: prevMenu[category].map((item) =>
        item.id === id ? { ...item, ...updatedFields } : item
      ),
    }));
  };

  return (
    <MenuContext.Provider value={{ menu, addProduct, removeProduct, editProduct }}>
      {children}
    </MenuContext.Provider>
  );
}
