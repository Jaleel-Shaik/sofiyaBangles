import { db } from "../../../shared/config/firebase";
import { ProductImage } from "../../../shared/types";
import { v4 as uuidv4 } from "uuid";

export const getImagesByProductModel = async (productId: string): Promise<ProductImage[]> => {
  const snapshot = await db
    .collection("product_images")
    .where("product_id", "==", productId)
    .get();

  const images = snapshot.docs.map((doc) => doc.data() as ProductImage);
  return images.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
};

export const createProductImageModel = async (data: Omit<ProductImage, 'id' | 'created_at' | 'updated_at'>): Promise<ProductImage> => {
  const newId = uuidv4();
  const now = new Date().toISOString();

  const image: ProductImage = {
    ...data,
    id: newId,
    created_at: now,
    updated_at: now,
  };

  await db.collection("product_images").doc(newId).set(image);
  return image;
};

export const updateProductImageModel = async (id: string, data: Partial<ProductImage>): Promise<ProductImage> => {
  const updateData: any = { ...data, updated_at: new Date().toISOString() };
  Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

  await db.collection("product_images").doc(id).update(updateData);

  const doc = await db.collection("product_images").doc(id).get();
  return doc.data() as ProductImage;
};

export const deleteProductImageModel = async (id: string): Promise<void> => {
  await db.collection("product_images").doc(id).delete();
};
