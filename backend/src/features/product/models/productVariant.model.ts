import { db } from "../../../shared/config/firebase";
import { ProductVariant } from "../../../shared/types";
import { v4 as uuidv4 } from "uuid";

export const getVariantsByProductModel = async (productId: string): Promise<ProductVariant[]> => {
  const snapshot = await db
    .collection("product_variants")
    .where("product_id", "==", productId)
    .get();

  const variants = snapshot.docs.map((doc) => doc.data() as ProductVariant);
  return variants.filter(v => v.status === "active" || v.status === "out_of_stock");
};

export const createProductVariantModel = async (data: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>): Promise<ProductVariant> => {
  const newId = uuidv4();
  const now = new Date().toISOString();

  const variant: ProductVariant = {
    ...data,
    id: newId,
    created_at: now,
    updated_at: now,
  };

  await db.collection("product_variants").doc(newId).set(variant);
  return variant;
};

export const updateProductVariantModel = async (id: string, data: Partial<ProductVariant>): Promise<ProductVariant> => {
  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

  await db.collection("product_variants").doc(id).update(updateData);

  const doc = await db.collection("product_variants").doc(id).get();
  return doc.data() as ProductVariant;
};

export const deleteProductVariantModel = async (id: string): Promise<void> => {
  await db.collection("product_variants").doc(id).update({
    status: "archived",
    updated_at: new Date().toISOString(),
  });
};

export const hardDeleteProductVariantModel = async (id: string): Promise<void> => {
  await db.collection("product_variants").doc(id).delete();
};
