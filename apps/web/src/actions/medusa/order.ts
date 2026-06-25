import { ActionError, defineAction } from "astro:actions";
import type { HttpTypes } from "@medusajs/types";
import type { AstroCookies } from "astro";
import { z } from "astro/zod";
import { getCart } from "@/lib/medusa/cart";
import medusa from "@/lib/medusa/client";
import { getCartId, removeCartId } from "@/lib/medusa/cookies";
import { getCustomer } from "@/lib/medusa/customer";
import medusaError from "@/lib/medusa/error";

async function updateCart(
  cookies: AstroCookies,
  data: HttpTypes.StoreUpdateCart
) {
  const cartId = getCartId(cookies);
  if (!cartId) {
    throw new ActionError({
      code: "NOT_FOUND",
      message: "No existing cart found, please create one before updating",
    });
  }

  try {
    const { cart } = await medusa.store.cart.update(cartId, data);
    return cart;
  } catch (error) {
    return medusaError(error);
  }
}

const addressSchema = (prefix: string) =>
  z.object({
    [`${prefix}.address_1`]: z.string(),
    [`${prefix}.city`]: z.string(),
    [`${prefix}.company`]: z.string().optional(),
    [`${prefix}.country_code`]: z.string(),
    [`${prefix}.first_name`]: z.string(),
    [`${prefix}.last_name`]: z.string(),
    [`${prefix}.postal_code`]: z.string(),
    [`${prefix}.province`]: z.string(),
    [`${prefix}.phone`]: z.string().optional(),
  });

function parseAddress(
  input: Record<string, unknown>,
  prefix: string
): {
  address_1: string;
  city: string;
  company?: string;
  phone?: string;
  country_code: string;
  first_name: string;
  last_name: string;
  postal_code: string;
  province: string;
} {
  return {
    address_1: input[`${prefix}.address_1`] as string,
    city: input[`${prefix}.city`] as string,
    company: input[`${prefix}.company`] as string | undefined,
    phone: input[`${prefix}.phone`] as string | undefined,
    country_code: input[`${prefix}.country_code`] as string,
    first_name: input[`${prefix}.first_name`] as string,
    last_name: input[`${prefix}.last_name`] as string,
    postal_code: input[`${prefix}.postal_code`] as string,
    province: input[`${prefix}.province`] as string,
  };
}

const setCheckoutAddresses = defineAction({
  accept: "form",
  input: addressSchema("shipping_address")
    .merge(addressSchema("billing_address").partial())
    .merge(
      z.object({
        email: z.string().email(),
      })
    ),
  async handler(input, ctx) {
    const cartId = getCartId(ctx.cookies);

    if (!cartId) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "No existing cart found when setting addresses",
      });
    }

    const customer = await getCustomer();

    const shippingAddress = parseAddress(input, "shipping_address");
    const email = input.email as string;

    // Billing address is optional - only parse if first_name is present
    const hasBillingAddress = !!input["billing_address.first_name"];
    const billingAddress = hasBillingAddress
      ? parseAddress(input, "billing_address")
      : null;

    const data = {
      email: customer?.email || email,
      shipping_address: {
        ...shippingAddress,
        address_2: "",
      },
      ...(billingAddress
        ? {
            billing_address: {
              ...billingAddress,
              address_2: "",
            },
          }
        : null),
    } satisfies HttpTypes.StoreUpdateCart;

    const cart = await updateCart(ctx.cookies, data);
    if (!cart) {
      return {
        status: "error",
        cart: null,
      };
    }

    return {
      status: "success",
      cart,
    };
  },
});

const setShippingMethod = defineAction({
  accept: "form",
  input: z.object({
    shippingMethodId: z.string(),
  }),
  async handler(input, ctx) {
    const cart = await getCart(ctx.cookies);

    if (!cart) {
      throw new ActionError({ code: "NOT_FOUND", message: "No cart id" });
    }

    try {
      const updatedCart = await medusa.store.cart.addShippingMethod(cart.id, {
        option_id: input.shippingMethodId,
      });
      return {
        status: "success",
        cart: updatedCart.cart,
      };
    } catch {
      return {
        status: "error",
        cart: null,
      };
    }
  },
});

const initiatePaymentSession = defineAction({
  accept: "json",
  input: z.object({
    cart: z.any(),
    data: z.object({
      provider_id: z.string(),
    }),
  }),
  async handler(input) {
    const res = await medusa.store.payment.initiatePaymentSession(
      input.cart,
      input.data
    );

    if (res.payment_collection) {
      const updatedCart = await medusa.store.cart.retrieve(input.cart.id);
      return {
        status: "success",
        cart: updatedCart.cart,
      };
    }

    return {
      status: "error",
      cart: null,
    };
  },
});

const placeOrder = defineAction({
  async handler(_, ctx) {
    const cartId = getCartId(ctx.cookies);

    if (!cartId) {
      throw new ActionError({
        code: "NOT_FOUND",
        message: "No existing cart found when placing an order",
      });
    }

    const cartRes = await medusa.store.cart.complete(cartId);

    if (cartRes.type === "order") {
      removeCartId(ctx.cookies);

      return {
        status: "success",
        redirect: `/${ctx.locals.countryCode}/order/confirmed/${cartRes.order.id}`,
      };
    }

    return {
      status: "success",
      cart: cartRes.cart,
    };
  },
});

export const order = {
  setShippingMethod,
  setCheckoutAddresses,
  initiatePaymentSession,
  placeOrder,
};
