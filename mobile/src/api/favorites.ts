import { getFirestore, collection, query, where, getDocs, doc, setDoc, deleteDoc, getDoc } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: any; // the joined product
}

export const getFavorites = async () => {
  try {
    const auth = getAuth();
    if (!auth.currentUser) return [];
    
    const db = getFirestore();
    const favRef = collection(db, 'favorites');
    const q = query(favRef, where('user_id', '==', auth.currentUser.uid));
    const snapshot = await getDocs(q);

    // Fetch the actual products for each favorite
    const favorites = [];
    for (const document of snapshot.docs) {
      const favData = document.data();
      let product = null;
      if (favData.product_id) {
        const productDoc = await getDoc(doc(db, 'products', favData.product_id));
        if (productDoc.data() != null) {
          product = { id: productDoc.id, ...productDoc.data() };
        }
      }
      favorites.push({ id: document.id, ...favData, product } as Favorite);
    }
    
    return favorites;
  } catch (error) {
    console.error('Error fetching favorites', error);
    return [];
  }
};

export const addFavorite = async (productId: string) => {
  try {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error("Not authenticated");

    const db = getFirestore();
    const newFavId = `${auth.currentUser.uid}_${productId}`;
    const favRef = doc(db, 'favorites', newFavId);

    const favData = {
      user_id: auth.currentUser.uid,
      product_id: productId,
      created_at: new Date().toISOString()
    };

    await setDoc(favRef, favData);
    return { success: true, data: { id: newFavId, ...favData } };
  } catch (error) {
    console.error('Error adding favorite', error);
    throw error;
  }
};

export const removeFavorite = async (productId: string) => {
  try {
    const auth = getAuth();
    if (!auth.currentUser) throw new Error("Not authenticated");

    const db = getFirestore();
    const favId = `${auth.currentUser.uid}_${productId}`;
    const favRef = doc(db, 'favorites', favId);

    await deleteDoc(favRef);
    return { success: true };
  } catch (error) {
    console.error('Error removing favorite', error);
    throw error;
  }
};
