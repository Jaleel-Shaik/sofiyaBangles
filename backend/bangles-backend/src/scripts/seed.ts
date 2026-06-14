import { createCategoryRepo } from '../repositories/category.repository';
import { createProductRepo } from '../repositories/product.repository';

const seedData = async () => {
  try {
    console.log('Seeding categories...');
    const bridal = await createCategoryRepo({
      category_name: 'Bridal',
      image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a',
      display_order: 1
    });

    const glass = await createCategoryRepo({
      category_name: 'Glass Bangles',
      image_url: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca5',
      display_order: 2
    });

    const stone = await createCategoryRepo({
      category_name: 'Stone Studded',
      image_url: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d',
      display_order: 3
    });

    console.log('Seeding products...');
    
    // Bridal products
    await createProductRepo({
      product_name: 'Royal Bridal Gold Set',
      description: 'Elegant handcrafted gold bangles perfect for your special day.',
      price: 2499,
      image_url: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a',
      category_id: bridal.id,
      quantity: 10
    });

    await createProductRepo({
      product_name: 'Traditional Bridal Chura',
      description: 'Classic red and white bridal chura set.',
      price: 1599,
      image_url: 'https://images.unsplash.com/photo-1599643478514-4a210053ce5c',
      category_id: bridal.id,
      quantity: 5
    });

    // Glass products
    await createProductRepo({
      product_name: 'Festive Glass Bangles (Red)',
      description: 'Beautiful red glass bangles that chime wonderfully.',
      price: 299,
      image_url: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca5',
      category_id: glass.id,
      quantity: 50
    });

    // Stone products
    await createProductRepo({
      product_name: 'Diamond Studded Premium Set',
      description: 'American diamond studded bangles for party wear.',
      price: 3999,
      image_url: 'https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d',
      category_id: stone.id,
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
