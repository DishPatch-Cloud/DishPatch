import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";

import { addItems, removeItem } from "../../redux/slices/cartSlice";
import type { AppDispatch, RootState } from "../../redux/store";
import { AUDFormatter } from "../../utils/currency";
import { menuPhotoUrl } from "../../utils/menuPhoto";
import { getMenus } from "../../https";
import useDragScroll from "../../hooks/useDragScroll";
import useVerticalDragScroll from "../../hooks/useVerticalDragScroll";
import DishDetail from "./DishDetail";

interface MenuItem {
  uuid: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

interface MenuCategory {
  menuName: string;
  icon?: string;
  items?: MenuItem[];
}

interface CartItem {
  uuid: string;
  name: string;
  pricePerQuantity: number;
  quantity: number;
}

interface MenusResponseData {
  data?: MenuCategory[];
}

interface MenuContainerProps {
  header?: ReactNode;
}

const MenuContainer = ({ header }: MenuContainerProps) => {
  const [menus, setMenus] = useState<MenuCategory[]>([]);
  const [selected, setSelected] = useState<MenuCategory | null>(null);
  const [openDish, setOpenDish] = useState<MenuItem | null>(null);
  const [railOpen, setRailOpen] = useState(true);

  const dispatch = useDispatch<AppDispatch>();

  const cart = useSelector(
    (state: RootState) => state.cart
  ) as CartItem[];

  const categoryDragScrollRef = useDragScroll();
  const itemDragScrollRef = useVerticalDragScroll();
  const itemScrollElementRef = useRef<HTMLDivElement | null>(null);

  const setItemScrollRef = useCallback(
    (node: HTMLDivElement | null): void => {
      itemScrollElementRef.current = node;
      itemDragScrollRef(node);
    },
    [itemDragScrollRef]
  );

  useEffect(() => {
    const loadMenus = async (): Promise<void> => {
      try {
        const response = await getMenus();
        const responseData = response.data as MenusResponseData;
        const menuData = responseData.data ?? [];
        setMenus(menuData);
        if (menuData.length > 0) {
          setSelected(menuData[0]);
        }
      } catch (error: unknown) {
        console.error("Error loading menus:", error);
      }
    };

    void loadMenus();
  }, []);

  const handleSelectCategory = (menu: MenuCategory): void => {
    if (selected?.menuName === menu.menuName) return;
    if (itemScrollElementRef.current) {
      itemScrollElementRef.current.scrollTop = 0;
    }
    setSelected(menu);
    setOpenDish(null);
    requestAnimationFrame(() => {
      if (itemScrollElementRef.current) {
        itemScrollElementRef.current.scrollTop = 0;
      }
    });
  };

  const getCartQty = (item: MenuItem): number => {
    const cartItem = cart.find((cartEntry) => cartEntry.uuid === item.uuid);
    return cartItem?.quantity ?? 0;
  };

  const handleIncrement = (item: MenuItem): void => {
    dispatch(
      addItems({
        uuid: item.uuid,
        name: item.name,
        pricePerQuantity: item.price,
        imageUrl: item.imageUrl,
      })
    );
  };

  const handleDecrement = (item: MenuItem): void => {
    dispatch(removeItem({ uuid: item.uuid }));
  };

  if (menus.length === 0) {
    return (
      <p className="mt-10 text-center text-sm text-[#a8741f]">
        Loading menus...
      </p>
    );
  }

  const categoryButton = (menu: MenuCategory, layout: "rail" | "bar") => {
    const active = selected?.menuName === menu.menuName;
    const count = menu.items?.length ?? 0;
    return (
      <button
        key={menu.menuName}
        type="button"
        draggable={false}
        onClick={() => handleSelectCategory(menu)}
        className={
          layout === "rail"
            ? `flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition ${
                active
                  ? "bg-[#e9b949] text-[#4a2c17] shadow-sm"
                  : "text-[#fff8ea] hover:bg-[#6e4526]"
              }`
            : `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-left transition ${
                active
                  ? "bg-[#e9b949] text-[#4a2c17] shadow-sm"
                  : "border border-[#8a5a32] text-[#fff8ea] hover:bg-[#6e4526]"
              }`
        }
      >
        <span className={`font-display font-semibold leading-none ${layout === "rail" ? "text-xl" : "text-lg"}`}>
          {menu.menuName}
        </span>
        <span className={`text-xs font-medium ${active ? "text-[#4a2c17]/70" : "text-[#fff8ea]/70"}`}>
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="flex h-full min-h-0">
      <nav
        className={`menu-rail hidden shrink-0 flex-col gap-2 overflow-hidden py-4 transition-[width] duration-300 md:flex ${
          railOpen ? "w-56 px-3" : "w-14 px-2"
        }`}
      >
        <button
          type="button"
          onClick={() => setRailOpen((open) => !open)}
          aria-expanded={railOpen}
          aria-label={railOpen ? "Collapse categories" : "Expand categories"}
          className={`flex items-center rounded-2xl py-2 text-[#f3d68f] transition hover:bg-[#6e4526] hover:text-[#fff8ea] ${
            railOpen ? "justify-between px-3" : "justify-center"
          }`}
        >
          {railOpen && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em]">
              Categories
            </span>
          )}
          {railOpen ? <IoChevronBack size={18} /> : <IoChevronForward size={18} />}
        </button>
        {railOpen && menus.map((menu) => categoryButton(menu, "rail"))}
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="menu-rail shrink-0 md:hidden">
          <div
            ref={categoryDragScrollRef}
            className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide"
          >
            {menus.map((menu) => categoryButton(menu, "bar"))}
          </div>
        </div>

        {header}

        <div
          ref={setItemScrollRef}
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          className="min-h-0 flex-1 cursor-grab overflow-y-auto overscroll-contain pb-28 scrollbar-hide active:cursor-grabbing"
        >
          <div
            key={selected?.menuName ?? "no-category"}
            className="grid gap-4 px-4 py-5 sm:grid-cols-2 sm:px-6 xl:grid-cols-3 2xl:grid-cols-4"
          >
            {selected?.items?.map((item) => {
              const quantity = getCartQty(item);
              const photo = menuPhotoUrl(item);
              return (
                <button
                  key={item.uuid}
                  type="button"
                  onClick={() => setOpenDish(item)}
                  className="glass-plate flex min-h-[280px] flex-col overflow-hidden rounded-3xl p-3 text-left transition duration-200 hover:-translate-y-0.5"
                >
                  <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-white/75">
                    {photo ? (
                      <img
                        src={photo}
                        alt=""
                        className="h-full w-full object-contain p-3"
                        draggable={false}
                      />
                    ) : null}
                    {quantity > 0 && (
                      <span className="absolute right-2 top-2 rounded-full bg-[#4a2c17] px-2.5 py-1 text-xs font-semibold text-white">
                        {quantity}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 px-1 font-display text-2xl font-semibold leading-7 text-[#4a2c17]">
                    {item.name}
                  </h3>
                  <p className="mt-auto px-1 pt-3 font-display text-xl font-semibold text-[#a8741f]">
                    {AUDFormatter.format(item.price)}
                  </p>
                </button>
              );
            })}

            {selected?.items?.length === 0 && (
              <div className="glass-plate col-span-full flex min-h-48 items-center justify-center rounded-3xl">
                <p className="text-sm text-[#6b4a33]">
                  No dishes in this category.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {openDish && (
        <DishDetail
          dish={openDish}
          quantity={getCartQty(openDish)}
          onClose={() => setOpenDish(null)}
          onIncrement={() => handleIncrement(openDish)}
          onDecrement={() => handleDecrement(openDish)}
        />
      )}
    </div>
  );
};

export default MenuContainer;
