import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";

import {
  getTotalPrice,
  removeAllItems,
} from "../../redux/slices/cartSlice";
import { removeCustomer } from "../../redux/slices/customerSlice";
import { addOrder, updateTable } from "../../https";
import type { AppDispatch, RootState } from "../../redux/store";
import { AUDFormatter } from "../../utils/currency";

interface TableInfo {
  tableNo: string;
}

interface CustomerState {
  customerName: string;
  customerPhone: string;
  guests: number;
  table: TableInfo | null;
}

interface CartItem {
  uuid: string;
  name: string;
  quantity: number;
  price: number;
  pricePerQuantity?: number;
}

interface AddOrderResponse {
  data: {
    data: {
      orderId: string;
      table?: string;
    };
  };
}

const OrderSummary = () => {
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();

  const customerData = useSelector(
    (state: RootState) => state.customer
  ) as CustomerState;

  const cartData = useSelector(
    (state: RootState) => state.cart
  ) as CartItem[];

  // Menu prices already include GST.
  const total = useSelector(getTotalPrice);

  const [isPlacingOrder, setIsPlacingOrder] =
    useState<boolean>(false);

  const tableUpdateMutation = useMutation({
    mutationFn: (requestData: {
      status: string;
      orderId: string;
      tableNo: string;
    }) => updateTable(requestData),
  });

  const orderMutation = useMutation({
    mutationFn: (requestData: unknown) =>
      addOrder(requestData),

    onSuccess: async (
      response: AddOrderResponse
    ) => {
      const { data } = response.data;

      tableUpdateMutation.mutate({
        status: "Occupied",
        orderId: data.orderId,
        tableNo:
          customerData.table?.tableNo ??
          data.table ??
          "",
      });

      await queryClient.invalidateQueries({
        queryKey: ["orders"],
      });

      enqueueSnackbar("Order placed successfully!", {
        variant: "success",
      });

      dispatch(removeCustomer());
      dispatch(removeAllItems());

      setIsPlacingOrder(false);
    },

    onError: (error: unknown) => {
      console.error(error);

      enqueueSnackbar("Failed to place order.", {
        variant: "error",
      });

      setIsPlacingOrder(false);
    },
  });

  const handlePlaceOrder = (): void => {
    if (!customerData.table?.tableNo) {
      enqueueSnackbar("Please select a table.", {
        variant: "warning",
      });
      return;
    }

    const orderData = {
      customerDetails: {
        name: customerData.customerName,
        phone: customerData.customerPhone,
        guests: customerData.guests || 1,
      },

      orderStatus: "Preparing",

      // Prices already include GST.
      bills: {
        total,
        tax: 0,
        totalWithTax: total,
      },

      items: cartData,

      table: customerData.table.tableNo,
    };

    setIsPlacingOrder(true);
    orderMutation.mutate(orderData);
  };

  return (
    <section className="bg-[#fffaf3] px-5 py-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display text-xl font-semibold text-[#4a2c17]">
            Total
          </p>
          <p className="text-xs text-[#6b4a33]">Includes GST</p>
        </div>
        <p className="font-display text-3xl font-semibold text-[#4a2c17]">
          {AUDFormatter.format(total)}
        </p>
      </div>

      <button
        data-no-drag
        type="button"
        onClick={handlePlaceOrder}
        disabled={
          isPlacingOrder ||
          orderMutation.isPending ||
          cartData.length === 0
        }
        className="mt-4 w-full rounded-full bg-[#e9b949] px-4 py-3.5 text-base font-semibold text-[#4a2c17] transition hover:bg-[#f0c85a] focus:outline-none focus:ring-4 focus:ring-[#e9b949]/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPlacingOrder || orderMutation.isPending
          ? "Placing order..."
          : "Place Order"}
      </button>
    </section>
  );
};

export default OrderSummary;