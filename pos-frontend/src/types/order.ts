export interface CustomerDetails {
  name: string;
  phone?: string;
  guests?: number;
}

export interface BillDetails {
  total: number;
  tax: number;
  totalWithTax: number;
}

export interface Item {
  uuid: string;
  name: string;
  pricePerQuantity: number;
  quantity?: number;
  imageUrl?: string;
}

export interface OrderedBy {
  userId: string;
  name?: string;
  email?: string;
}

export interface Order {
  orderId: string;      // full UUID
  displayId: string;    // short 4-digit code
  orderStatus: "Preparing" | "Ready" | "Served" | "Paid" | "Cancelled" | string;
  orderDate: string;
  customerDetails: CustomerDetails;
  orderedBy?: OrderedBy;
  bills?: BillDetails;
  items?: Item[];
  table?: { tableNo: string } | string;
}