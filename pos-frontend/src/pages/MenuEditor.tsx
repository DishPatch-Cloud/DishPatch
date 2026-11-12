import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import type { AxiosError, AxiosResponse } from "axios";
import { enqueueSnackbar } from "notistack";

import BottomNav from "../components/shared/BottomNav";
import { addMenu, createMenuPhotoUpload, saveMenuPhoto } from "../https";
import type { RootState } from "../redux/store";
import { canEditMenu } from "../utils/roles";

interface DishForm {
  menuName: string;
  name: string;
  price: string;
  description: string;
  file: File | null;
}

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_LIMIT = 5 * 1024 * 1024;

const emptyForm = (): DishForm => ({ menuName: "", name: "", price: "", description: "", file: null });

const MenuEditor = () => {
  const navigate = useNavigate();
  const role = useSelector((state: RootState) => state.user.role);
  const [form, setForm] = useState<DishForm>(emptyForm());
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "POS | Edit menu";
  }, []);

  const saveDish = useMutation<
    AxiosResponse<{ message?: string; data?: { dish?: { uuid?: string } } }>,
    AxiosError<{ message?: string }> | Error,
    DishForm
  >({
    mutationFn: async (dish) => {
      if (dish.file && !PHOTO_TYPES.includes(dish.file.type)) {
        throw new Error("Photo must be a JPEG, PNG, or WebP.");
      }
      if (dish.file && dish.file.size > PHOTO_LIMIT) {
        throw new Error("Photo must be 5 MB or smaller.");
      }
      const created = await addMenu({
        menuName: dish.menuName.trim(),
        name: dish.name.trim(),
        price: Number(dish.price),
        description: dish.description.trim(),
      });
      const uuid = created.data.data?.dish?.uuid;
      if (!dish.file || !uuid) return created;
      try {
        const signed = await createMenuPhotoUpload(uuid, dish.file.type);
        const uploaded = await fetch(signed.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": dish.file.type },
          body: dish.file,
        });
        if (!uploaded.ok) throw new Error("upload failed");
        await saveMenuPhoto(uuid, signed.data.imageUrl);
      } catch {
        throw new Error("The dish was added, but the photo was not uploaded.");
      }
      return created;
    },
    onSuccess: (response) => {
      enqueueSnackbar(response.data.message || "Dish added.", { variant: "success" });
      setForm(emptyForm());
      if (fileInput.current) fileInput.current.value = "";
    },
    onError: (error) => {
      const responseMessage = "response" in error ? error.response?.data?.message : undefined;
      enqueueSnackbar(responseMessage || error.message || "Could not add the dish.", { variant: "error" });
    },
  });

  if (!canEditMenu(role)) {
    return <Navigate to="/menu" replace />;
  }

  return (
    <section className="h-full overflow-hidden bg-background font-sans">
      <div className="h-[calc(100%-5rem)] overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-xl">
          <button type="button" onClick={() => navigate("/menu")} className="text-sm font-semibold text-primary">
            Back to menu
          </button>
          <h1 className="mt-3 text-2xl font-bold text-text-primary">Edit menu</h1>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Add a dish to this location's menu. Everyone here sees the same menu.
            A new category is created when the category name is new.
            The description is shown on the dish. A photo is stored for this dish and shown from its saved address. Dishes that already have a picture keep using it.
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
              <span className="mb-2 block font-medium text-text-secondary">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                maxLength={400}
                rows={3}
                placeholder="A short note about this dish"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-text-primary outline-none focus:border-primary"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-2 block font-medium text-text-secondary">Photo</span>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setForm({ ...form, file: event.target.files?.[0] ?? null })}
                className="w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-primary-light file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
              />
              <span className="mt-1 block text-xs leading-5 text-text-secondary">JPEG, PNG, or WebP, up to 5 MB. The website loads it from the address saved on this dish.</span>
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
