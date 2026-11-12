import { useEffect } from "react";
import { IoClose } from "react-icons/io5";

import { AUDFormatter } from "../../utils/currency";
import { menuPhotoUrl } from "../../utils/menuPhoto";

interface Dish {
  uuid: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
}

interface DishDetailProps {
  dish: Dish;
  quantity: number;
  onClose: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}

const DishDetail = ({
  dish,
  quantity,
  onClose,
  onIncrement,
  onDecrement,
}: DishDetailProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const photo = menuPhotoUrl(dish);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#1c100a]/55"
        aria-label="Close dish"
        onClick={onClose}
      />

      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="dish-detail-title"
        className="glass-plate relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-2 text-[#4a2c17] shadow-sm transition hover:bg-white"
          aria-label="Close dish"
        >
          <IoClose size={22} />
        </button>

        <div className="flex h-64 shrink-0 items-center justify-center bg-white/70 sm:h-80">
          {photo ? (
            <img
              src={photo}
              alt={dish.name}
              className="h-full w-full object-contain p-6"
            />
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a8741f]">
            HARBS
          </p>
          <div className="mt-2 flex items-start justify-between gap-4">
            <h2
              id="dish-detail-title"
              className="font-display text-3xl font-semibold leading-tight text-[#4a2c17]"
            >
              {dish.name}
            </h2>
            <p className="shrink-0 pt-1 font-display text-2xl font-semibold text-[#4a2c17]">
              {AUDFormatter.format(dish.price)}
            </p>
          </div>

          <p className="mt-4 text-[15px] leading-7 text-[#6b4a33]">
            {dish.description?.trim() || "A description for this dish has not been added yet."}
          </p>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm font-medium tracking-wide text-[#6b4a33]">
              Quantity
            </span>
            <div className="flex items-center rounded-full border border-white bg-white/60">
              <button
                type="button"
                onClick={onDecrement}
                disabled={quantity === 0}
                className="flex h-11 w-11 items-center justify-center rounded-l-full text-lg text-[#6b4a33] transition hover:bg-white disabled:opacity-30"
                aria-label={`Remove one ${dish.name}`}
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold text-[#4a2c17]">
                {quantity}
              </span>
              <button
                type="button"
                onClick={onIncrement}
                className="flex h-11 w-11 items-center justify-center rounded-r-full text-lg text-[#4a2c17] transition hover:bg-white"
                aria-label={`Add one ${dish.name}`}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};

export default DishDetail;
