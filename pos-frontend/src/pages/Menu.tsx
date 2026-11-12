import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { IoClose } from "react-icons/io5";
import { BiCart } from "react-icons/bi";

import BottomNav from "../components/shared/BottomNav";
import MenuContainer from "../components/menu/MenuContainer";
import TableInfo from "../components/menu/TableInfo";
import CartInfo from "../components/menu/CartInfo";
import OrderSummary from "../components/menu/OrderSummary";
import type { RootState } from "../redux/store";
import { canEditMenu } from "../utils/roles";

const Menu = () => {
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.user.role);
  const cart = useSelector((state: RootState) => state.cart);
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const openCart = () => {
    setIsCartOpen(true);
  };

  const closeCart = () => {
    setIsCartOpen(false);
  };

  return (
    <section className="menu-room h-full overflow-hidden font-sans">
      <div className="h-[calc(100%-5rem)] min-h-0">
        <MenuContainer
          header={
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-6">
              <h1 className="font-display text-4xl font-semibold tracking-tight text-[#141a22]">
                Menu
              </h1>

              {canEditMenu(role) && (
                <button
                  type="button"
                  onClick={() => navigate("/menu/edit")}
                  className="glass-plate rounded-full px-4 py-2 text-sm font-semibold text-[#141a22] transition hover:-translate-y-0.5"
                >
                  Edit menu
                </button>
              )}
            </div>
          }
        />
      </div>

      <button
        type="button"
        onClick={openCart}
        className="glass-plate fixed bottom-24 right-4 z-30 flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold text-[#141a22] transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-white/40"
        aria-label={`View cart, ${itemCount} items`}
      >
        <BiCart size={22} />
        View cart
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#141a22] px-2 text-xs font-semibold text-white">
          {itemCount}
        </span>
      </button>

      {isCartOpen && (
        <button
          type="button"
          onClick={closeCart}
          className="fixed inset-x-0 bottom-20 top-20 z-40 bg-[#1c100a]/45"
          aria-label="Close cart"
        />
      )}

      <aside
        className={`
          fixed z-50 flex min-h-0 flex-col overflow-hidden
          border border-white/80 bg-white/90
          shadow-[0_18px_50px_rgba(28,16,10,0.28)]
          transition-transform duration-300 ease-out
          inset-x-0 bottom-20 h-[calc(100dvh-10rem)] rounded-t-3xl
          lg:inset-x-auto lg:bottom-20 lg:right-0 lg:top-20 lg:h-auto lg:w-[420px] lg:rounded-l-3xl lg:rounded-tr-none
          ${isCartOpen ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-full lg:translate-y-0"}
        `}
        aria-hidden={!isCartOpen}
      >
        {/* Drawer header */}
        <div className="flex shrink-0 items-center justify-between bg-[#141a22] px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <BiCart className="text-xl" />

            <h2 className="text-lg font-semibold">
              Your Cart
            </h2>
          </div>

          <button
            type="button"
            onClick={closeCart}
            className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Close cart"
          >
            <IoClose size={24} />
          </button>
        </div>

        {/* Fixed table information */}
        <div className="shrink-0">
          <TableInfo />
        </div>

        {/* CartInfo receives the remaining fixed height */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <hr className="border-border" />
          <CartInfo />
        </div>

        {/* Fixed order summary */}
        <div className="shrink-0 border-t border-border bg-surface">
          <OrderSummary />
        </div>
      </aside>

      <BottomNav />
    </section>
  );
};

export default Menu;