import { createCategoryModel } from '../features/category/models/category.model';
import { createProductModel } from '../features/product/models/product.model';
import { createModelTypeModel, getModelTypesModel } from '../features/model-type/models/modelType.model';

const seedData = async () => {
  try {
    console.log('Fetching or creating "bangles" model type...');
    const modelTypes = await getModelTypesModel();
    let banglesMT = modelTypes.find(mt => mt.name?.toLowerCase() === 'bangles');
    
    if (!banglesMT) {
      console.log('Creating "bangles" model type...');
      banglesMT = await createModelTypeModel({ name: 'bangles' });
    }
    
    const model_type_id = banglesMT.id;
    console.log(`Using Model Type ID: ${model_type_id}`);

    console.log('Seeding categories...');
    const bridal = await createCategoryModel({
      category_name: 'Bridal',
      image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a',
      display_order: 1,
      model_type_id
    });

    const glass = await createCategoryModel({
      category_name: 'Glass Bangles',
      image_url: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca5',
      display_order: 2,
      model_type_id
    });

    const stone = await createCategoryModel({
      category_name: 'Stone Studded',
      image_url: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d',
      display_order: 3,
      model_type_id
    });

    console.log('Seeding products...');
    
    // Bridal products
    await createProductModel({
      product_name: 'Royal Bridal Gold Set',
      description: 'Elegant handcrafted gold bangles perfect for your special day.',
      price: 2499,
      images: [{ image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a' }],
      category_id: bridal.id,
      model_type_id,
      quantity: 10
    });

    await createProductModel({
      product_name: 'Traditional Bridal Chura',
      description: 'Classic red and white bridal chura set.',
      price: 1599,
      images: [{ image_url: 'https://images.unsplash.com/photo-1599643478514-4a210053ce5c' }],
      category_id: bridal.id,
      model_type_id,
      quantity: 5
    });

    // Glass products
    await createProductModel({
      product_name: 'Festive Glass Bangles (Red)',
      description: 'Beautiful red glass bangles that chime wonderfully.',
      price: 299,
      images: [{ image_url: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca5' }],
      category_id: glass.id,
      model_type_id,
      quantity: 50
    });

    // Stone products
    await createProductModel({
      product_name: 'Diamond Studded Premium Set',
      description: 'American diamond studded bangles for party wear.',
      price: 3999,
      images: [{ image_url: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d' }],
      category_id: stone.id,
      model_type_id,
      quantity: 8
    });

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
