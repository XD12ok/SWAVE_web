import { BuyerSchema } from "@/schemas/buyer.schema";
import { ShippingSchema } from "@/schemas/shipping.schema";
import { PaymentSchema } from "@/schemas/payment.schema";
import { OrderItemSchema } from "@/schemas/order-item.schema";

export interface IOrder extends BaseDocument {
  invoiceNumber: string;

  buyer: {
    type: BuyerSchema;
    required: true;
  };

  shipping: {
    type: ShippingSchema;
    required: true;
  };

  items: {
    type: [OrderItemSchema];
    default: [];
  };

  payment: {
    type: PaymentSchema;
    default: () => {};
  };
}
