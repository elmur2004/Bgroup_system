import { getRequiredSession } from "@/lib/crm/session";
import { getProducts } from "./actions";
import { ProductsClient } from "./products-client";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ entityId?: string; category?: string; active?: string }>;
}) {
  await getRequiredSession();
  const params = await searchParams;

  const products = await getProducts({
    entityId: params.entityId,
    category: params.category,
    active: params.active !== undefined ? params.active === "true" : undefined,
  });

  return <ProductsClient products={products} />;
}
