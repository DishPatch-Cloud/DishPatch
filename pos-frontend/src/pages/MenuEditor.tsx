import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError, AxiosResponse } from "axios";
import { enqueueSnackbar } from "notistack";

import BottomNav from "../components/shared/BottomNav";
import { addMenu } from "../https";
import type { RootState } from "../redux/store";
import { canEditMenu } from "../utils/roles";

interface DishForm {
  menuName: string;
  name: string;
  price: string;
}

const emptyForm = (): DishForm => ({ menuName: "", name: "", price: "" });

const MenuEditor = () => {
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.user.role);
  const [form, setForm] = useState<DishForm>(emptyForm());

  useEffect(() => {
    document.title = "POS | Edit menu";
  }, []);

  const saveDish = useMutation<
    AxiosResponse<{ message?: string }>,
    AxiosError<{ message?: string }>,
    DishForm
  >({
    mutationFn: (dish) => addMenu({
      menuName: dish.menuName.trim(),
      name: dish.name.trim(),
      price: Number(dish.price),
    }),
    onSuccess: (response) => {
      enqueueSnackbar(response.data.message || "Dish added.", { variant: "success" });
      setForm(emptyForm());
    },
    onError: (error) => {
      enqueueSnackbar(error.response?.data?.message || "Could not add the dish.", { variant: "error" });
    },
  });

  if (!canEditMenu(role)) {
    return <Navigate to="/menu" replace />;
  }

  return (
    <section className="h-[calc(100dvh-5rem)] overflow-hidden bg-background font-sans">
      <div className="h-[calc(100%-5rem)] overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-xl">
          <button type="button" onClick={() => navigate("/menu")} className="text-sm font-semibold text-primary">
            Back to menu
          </button>
          <h1 className="mt-3 text-2xl font-bold text-text-primary">Edit menu</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Add a dish to this location's menu. Everyone here sees the same menu.
            A new category is created when the category name is new.
          </p>
          <form
            className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-card"
            onSubmit={(event) => {
              event.preventDefault();
              saveDish.mutate(form);
            }}
          >
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-text-secondary">Category</span>
              <input
                value={form.menuName}
                onChange={(event) => setForm({ ...form, menuName: event.target.value })}
                required
                placeholder="Pasta"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text-primary outline-none focus:border-primary"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-text-secondary">Dish name</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                placeholder="Tomato pasta"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text-primary outline-none focus:border-primary"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-text-secondary">Price</span>
              <input
                value={form.price}
                onChange={(event) => setForm({ ...form, price: event.target.value })}
                required
                inputMode="decimal"
                placeholder="17"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text-primary outline-none focus:border-primary"
              />
            </label>
            <button
              type="submit"
              disabled={saveDish.isPending}
              className="w-full rounded-xl bg-primary px-4 py-3 text-base font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {saveDish.isPending ? "Adding" : "Add dish"}
            </button>
          </form>
        </div>
      </div>
      <BottomNav />
    </section>
  );
};

export default MenuEditor;
