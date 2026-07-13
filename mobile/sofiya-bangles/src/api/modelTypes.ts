import { getFirestore, collection, getDocs, doc, setDoc } from '@react-native-firebase/firestore';

export interface ModelType {
  id: string;
  name: string;
}

const DEFAULT_MODEL_TYPES: ModelType[] = [
  { id: 'mt-1', name: 'Bangles' },
  { id: 'mt-2', name: 'Rings' },
  { id: 'mt-3', name: 'Necklaces' },
  { id: 'mt-4', name: 'Blouses' },
];

export const getModelTypes = async (): Promise<ModelType[]> => {
  try {
    const db = getFirestore();
    const modelTypesRef = collection(db, 'model_types');
    const snapshot = await getDocs(modelTypesRef);

    if (snapshot.empty) {
      console.log('Model Types collection is empty. Seeding defaults...');
      for (const mt of DEFAULT_MODEL_TYPES) {
        await setDoc(doc(db, 'model_types', mt.id), mt);
      }
      return DEFAULT_MODEL_TYPES;
    }

    return snapshot.docs.map(document => ({ id: document.id, ...document.data() } as ModelType));
  } catch (error) {
    console.error('Error fetching model types', error);
    return [];
  }
};
