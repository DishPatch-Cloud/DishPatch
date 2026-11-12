import { RiDeleteBin2Fill } from "react-icons/ri";
import { useDispatch, useSelector } from "react-redux";

import {
  removeAllItems,
  removeItemCompletely,
} from "../../redux/slices/cartSlice";
import type { AppDispatch, RootState } from "../../redux/store";
import { AUDFormatter } from "../../utils/currency";
import { menuPhotoUrl } from "../../utils/menuPhoto";

interface CartItem {
  uuid: string;
  name: string;
  quantity: number;
  price: number;
  pricePerQuantity?: number;
  imageUrl?: string;
}

const CartInfo = () => {
  const cartData = useSelector(
    (state: RootState) => state.cart
  ) as CartItem[];

  const dispatch = useDispatch<AppDispatch>();

  const handleRemove = (item: CartItem): void => {
    dispatch(
      removeItemCompletely({
        uuid: item.uuid,
      })
    );
  };

  const handleRemoveAll = (): void => {
    dispatch(removeAllItems());
  };

  return (
    <section className="mt-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-semibold text-[#4a2c17]">
          Items
        </h2>
        <button
          data-no-drag
          type="button"
          onClick={handleRemoveAll}
          disabled={cartData.length === 0}
          className="text-sm font-semibold text-[#a8741f] transition hover:text-[#4a2c17] disabled:opacity-30"
        >
          Clear
        </button>
      </div>

      {cartData.length === 0 ? (
        <p className="mt-4 text-sm text-[#6b4a33]">Nothing here yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {cartData.map((item) => (
            <article
              key={item.uuid}
              className="glass-plate flex items-center gap-3 rounded-2xl p-2"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/80">
                {menuPhotoUrl(item) ? (
                  <img
                    src={menuPhotoUrl(item)}
                    alt=""
                    className="h-full w-full object-contain p-1"
                    draggable={false}
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-lg font-semibold leading-5 text-[#4a2c17]">
                  {item.name}
                </h3>
                <p className="text-sm font-semibold text-[#a8741f]">
                  {AUDFormatter.format(item.price)}
                </p>
              </div>
              <span className="rounded-full bg-[#e9b949] px-2.5 py-1 text-xs font-semibold text-[#4a2c17]">
                ×{item.quantity}
              </span>
              <button
                data-no-drag
                type="button"
                onClick={() => handleRemove(item)}
                aria-label={`Remove ${item.name}`}
                className="rounded-full p-2 text-[#a8741f] transition hover:bg-white hover:text-[#8a3b2c]"
              >
                <RiDeleteBin2Fill size={16} />
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default CartInfo;