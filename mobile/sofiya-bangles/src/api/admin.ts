import { getFirestore, collection, getCountFromServer, query, where, addDoc } from '@react-native-firebase/firestore';
import { getStorage, ref, putFile, getDownloadURL } from '@react-native-firebase/storage';

export const getOverviewAnalytics = async () => {
  try {
    const db = getFirestore();
    const productsSnapshot = await getCountFromServer(collection(db, 'products'));
    const usersSnapshot = await getCountFromServer(query(collection(db, 'profiles'), where('role', '==', 'user')));
    const favoritesSnapshot = await getCountFromServer(collection(db, 'favorites'));
    const categoriesSnapshot = await getCountFromServer(collection(db, 'categories'));

    return {
      totalProducts: productsSnapshot.data().count,
      totalUsers: usersSnapshot.data().count,
      totalFavorites: favoritesSnapshot.data().count,
      totalCategories: categoriesSnapshot.data().count,
    };
  } catch (error) {
    console.error('Error fetching analytics', error);
    return null;
  }
};

export const createProduct = async (productData: any, imageUri?: string) => {
  try {
    let finalImageUrl = productData.image_url || 'https://images.unsplash.com/photo-1599643478524-fb66f453863a';

    // If an actual image URI is provided from image picker, upload it to Firebase Storage
    if (imageUri && !imageUri.startsWith('http')) {
      const filename = imageUri.substring(imageUri.lastIndexOf('/') + 1);
      const storage = getStorage();
      const reference = ref(storage, `products/${filename}`);
      await putFile(reference, imageUri);
      finalImageUrl = await getDownloadURL(reference);
    }

    const db = getFirestore();
    const productsRef = collection(db, 'products');
    const docRef = await addDoc(productsRef, {
      ...productData,
      image_url: finalImageUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true
    });

    return { success: true, id: docRef.id };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to create product');
  }
};

// ... other admin methods can be ported similarly, left out for brevity if unused currently
export const broadcastNotification = async (notificationData: any) => {
  // Add to global notifications collection
  const db = getFirestore();
  const notifRef = collection(db, 'notifications');
  await addDoc(notifRef, {
    ...notificationData,
    created_at: new Date().toISOString()
  });
  return { success: true };
};
