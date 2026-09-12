import { createCategoryService } from '../features/category/services/category.service';
import { createProductService } from '../features/product/services/product.service';
import { createProductSchema } from '../features/product/validations/product.validation';
import { createModelTypeService, getAllModelTypesService } from '../features/model-type/services/modelType.service';

const seedData = async () => {
  try {
    console.log('Fetching or creating "bangles" model type...');
    const modelTypes = await getAllModelTypesService();
    let banglesMT = modelTypes.find(mt => mt.name?.toLowerCase() === 'bangles');
    
    if (!banglesMT) {
      console.log('Creating "bangles" model type...');
      banglesMT = await createModelTypeService({ name: 'bangles' });
    }
    
    const model_type_id = banglesMT.id;
    console.log(`Using Model Type ID: ${model_type_id}`);

    console.log('Seeding categories...');
    const bridal = await createCategoryService({
      category_name: 'Bridal',
      image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a',
      display_order: 1,
      model_type_id
    }, undefined, 'seed-script');

    const glass = await createCategoryService({
      category_name: 'Glass Bangles',
      image_url: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca5',
      display_order: 2,
      model_type_id
    }, undefined, 'seed-script');

    const stone = await createCategoryService({
      category_name: 'Stone Studded',
      image_url: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d',
      display_order: 3,
      model_type_id
    }, undefined, 'seed-script');

    console.log('Seeding products...');
    
    // Bridal products
    await createProductService(createProductSchema.parse({
      product_name: 'Royal Bridal Gold Set',
      description: 'Elegant handcrafted gold bangles perfect for your special day.',
      price: 2499,
      images: [{ image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a' }],
      category_id: bridal.id,
      model_type_id,
      quantity: 10
    }), undefined, 'seed-script');

    await createProductService(createProductSchema.parse({
      product_name: 'Traditional Bridal Chura',
      description: 'Classic red and white bridal chura set.',
      price: 1599,
      images: [{ image_url: 'https://images.unsplash.com/photo-1599643478514-4a210053ce5c' }],
      category_id: bridal.id,
      model_type_id,
      quantity: 5
    }), undefined, 'seed-script');

    // Glass products
    await createProductService(createProductSchema.parse({
      product_name: 'Festive Glass Bangles (Red)',
      description: 'Beautiful red glass bangles that chime wonderfully.',
      price: 299,
      images: [{ image_url: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca5' }],
      category_id: glass.id,
      model_type_id,
      quantity: 50
    }), undefined, 'seed-script');

    // Stone products
    await createProductService(createProductSchema.parse({
      product_name: 'Diamond Studded Premium Set',
      description: 'American diamond studded bangles for party wear.',
      price: 3999,
      images: [{ image_url: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d' }],
      category_id: stone.id,
      model_type_id,
      quantity: 8
    }), undefined, 'seed-script');

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
