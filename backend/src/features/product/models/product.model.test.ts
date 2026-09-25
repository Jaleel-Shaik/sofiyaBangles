import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReviewStats, deleteProductModel, restoreProductModel } from './product.model';
import { createProductService, lookupProductByCodeOrIdService, sellProductService } from '../services/product.service';
import { createProductSchema } from '../validations/product.validation';
import { db } from '../../../shared/config/firebase';
import { getProductByCodeOrIdDb } from '../../../db/product.db';
import { createCustomerAccountModel } from '../../../shared/models/identity.model';
import { OrderService } from '../../order/services/order.service';

test('Product Model Setup and Lifecycle', async (t) => {
  await t.test('calculateReviewStats averages ratings and preserves review count', () => {
    const result = calculateReviewStats([
      { rating: 5 },
      { rating: 4 },
      { rating: 3 },
    ] as Array<{ rating: number }>);

    assert.deepEqual(result, { rating: 4, reviews: 3 });
  });

  await t.test('Product lifecycle: creation, soft-deletion, and restoration updates properties', async () => {
    // Verify Firestore connectivity before running cloud mutations
    try {
      await db.collection("model_types").limit(1).get();
    } catch (err: any) {
      if (err.code === 16 || err.message?.includes("UNAUTHENTICATED") || err.message?.includes("invalid authentication")) {
        console.warn("⚠️ Skipping live Firestore lifecycle test: Mock/unauthenticated credentials in test environment.");
        return;
      }
      throw err;
    }

    const testModelId = 'test-mt-' + Date.now();
    const testCatId = 'test-cat-' + Date.now();

    // Seed prerequisite ModelType and Category
    await db.collection("model_types").doc(testModelId).set({
      id: testModelId,
      name: "Test Model Type",
      is_active: true,
      created_at: new Date().toISOString()
    });

    await db.collection("categories").doc(testCatId).set({
      id: testCatId,
      category_name: "Test Category",
      model_type_id: testModelId,
      is_active: true,
      created_at: new Date().toISOString()
    });

    try {
      // 1. Create product
      const product = await createProductService(createProductSchema.parse({
        product_name: 'Test Bangle',
        price: 150,
        quantity: 10,
        is_active: true,
        category_id: testCatId,
        model_type_id: testModelId
      }), undefined, 'test-actor-id');

      assert.ok(product.id, 'Product should have an ID');
      assert.equal(product.status, 'active', 'Created product status should be active');
      assert.equal(product.deleted_at, null, 'New product deleted_at should be null');

      // 2. Soft-delete product
      const deletedProduct = await deleteProductModel(product.id);
      assert.ok(deletedProduct, 'Deleted product should be returned');
      
      // Fetch from DB to ensure persisted
      const doc = await db.collection("products").doc(product.id).get();
      const updated = doc.data();

      assert.ok(updated, 'Updated document data should exist');
      assert.equal(updated.is_active, false, 'Soft-deleted product is_active should be false');
      assert.equal(updated.status, 'archived', 'Soft-deleted product status should be archived');
      assert.ok(updated.deleted_at, 'deleted_at should be populated with timestamp');

      // 3. Restore product
      await restoreProductModel(product.id);
      const docRestored = await db.collection("products").doc(product.id).get();
      const restored = docRestored.data();

      assert.ok(restored, 'Restored document data should exist');
      assert.equal(restored.is_active, true, 'Restored product is_active should be true');
      assert.equal(restored.status, 'active', 'Restored product status should be active');
      assert.equal(restored.deleted_at, null, 'Restored product deleted_at should be null');

      // Cleanup product
      await db.collection("products").doc(product.id).delete();
    } finally {
      // Cleanup prerequisite seeds
      await db.collection("model_types").doc(testModelId).delete();
      await db.collection("categories").doc(testCatId).delete();
    }
  });

  await t.test('createProductSchema parses and transforms multipart string fields correctly', () => {
    const rawInput = {
      product_name: 'Test Product Parsing',
      category_id: 'test-cat-id',
      model_type_id: 'test-model-id',
      price: '199.99',
      quantity: '42',
      has_variants: 'true',
      variants: JSON.stringify([
        { id: 'v1', size: '2.4', price: '199.99', quantity: '20' }
      ]),
      accepts_custom_size: 'true',
      custom_size_price: '249.99'
    };

    const parsed = createProductSchema.parse(rawInput);

    assert.equal(parsed.product_name, 'Test Product Parsing');
    assert.equal(parsed.category_id, 'test-cat-id');
    assert.equal(parsed.model_type_id, 'test-model-id');
    assert.equal(parsed.price, 199.99, 'price should be parsed as number');
    assert.equal(parsed.quantity, 42, 'quantity should be parsed as integer');
    assert.equal(parsed.has_variants, true, 'has_variants should be parsed as boolean');
    assert.ok(Array.isArray(parsed.variants), 'variants should be parsed to an array');
    assert.equal(parsed.variants[0].size, '2.4');
    assert.equal(parsed.accepts_custom_size, true, 'accepts_custom_size should be parsed as boolean');
    assert.equal(parsed.custom_size_price, 249.99, 'custom_size_price should be parsed as number');
  });

  await t.test('Product Special ID lookup and sale by code decrements stock count', async () => {
    // Check Firestore connectivity
    try {
      await db.collection("model_types").limit(1).get();
    } catch (err: any) {
      console.warn("⚠️ Skipping live Firestore test: unauthenticated.");
      return;
    }

    const testMtId = 'test-mt-code-' + Date.now();
    const testCatId = 'test-cat-code-' + Date.now();
    const testProdId = 'test-prd-code-' + Date.now();
    const specialCode = `TST-${Date.now().toString().slice(-4)}`;

    await db.collection("model_types").doc(testMtId).set({
      id: testMtId,
      name: "Silk Bangles",
      is_active: true,
      created_at: new Date().toISOString()
    });

    await db.collection("categories").doc(testCatId).set({
      id: testCatId,
      category_name: "Silk Thread Regular",
      model_type_id: testMtId,
      is_active: true,
      created_at: new Date().toISOString()
    });

    await db.collection("products").doc(testProdId).set({
      id: testProdId,
      unique_code: specialCode,
      product_name: "Test Special Bangles",
      description: "Testing code sell",
      price: 499,
      quantity: 15,
      category_id: testCatId,
      model_type_id: testMtId,
      is_active: true,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    try {
      // 1. Test lookup by unique_code (both uppercase and lowercase)
      const foundByCode = await getProductByCodeOrIdDb(specialCode);
      assert.ok(foundByCode, 'Product must be found by unique_code');
      assert.equal(foundByCode.id, testProdId);
      assert.equal(foundByCode.unique_code, specialCode);

      const foundByLowerCode = await getProductByCodeOrIdDb(specialCode.toLowerCase());
      assert.ok(foundByLowerCode, 'Product must be found even if entered in lowercase');
      assert.equal(foundByLowerCode.id, testProdId);

      // 2. Test lookupProductByCodeOrIdService
      const serviceLookup = await lookupProductByCodeOrIdService(specialCode);
      assert.ok(serviceLookup, 'lookupProductByCodeOrIdService must return product');
      assert.equal(serviceLookup.product_name, "Test Special Bangles");
      assert.equal(serviceLookup.category_name, "Silk Thread Regular");
      assert.equal(serviceLookup.model_type_name, "Silk Bangles");

      let soldProductOrderId: string | null = null;
      try {
        // 3. Test sellProductService using the special code
        const soldProduct = await sellProductService(specialCode, 3, 'test-admin-actor');
        assert.ok(soldProduct, 'Sold product must be returned');
        assert.equal(soldProduct.quantity, 12, 'Stock quantity must decrement from 15 to 12');
        soldProductOrderId = (soldProduct as any)?.order?.id || null;

        // Verify Firestore state
        const docCheck = await db.collection("products").doc(testProdId).get();
        assert.equal(docCheck.data()?.quantity, 12, 'Persisted Firestore quantity must be 12');

        // 4. Test insufficient stock throws error
        await assert.rejects(
          async () => {
            await sellProductService(specialCode, 20, 'test-admin-actor');
          },
          { message: 'INSUFFICIENT_STOCK' }
        );

        // 5. Test sellProductService fulfilling an existing customer order by order_number
        const customerOrderId = "test-ord-" + Date.now();
        const customerOrderNumber = "ORD-" + Date.now().toString().slice(-6);
        const testCustomerUserId = "cust-" + Date.now();

        await db.collection("orders").doc(customerOrderId).set({
          id: customerOrderId,
          order_number: customerOrderNumber,
          user_id: testCustomerUserId,
          status: "pending",
          payment_status: "pending",
          total_amount: 1500,
          subtotal: 1500,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        await db.collection("order_items").doc("item-" + customerOrderId).set({
          id: "item-" + customerOrderId,
          order_id: customerOrderId,
          product_id: testProdId,
          product_name_snapshot: "Test Special Bangles",
          price_snapshot: 500,
          quantity: 3,
          subtotal: 1500,
          image_url: "https://example.com/bangles.jpg",
          created_at: new Date().toISOString(),
        });

        // Admin fulfills the order using the order_number
        const fulfilledResult = await sellProductService(specialCode, 3, 'test-admin-actor', {
          order_number: customerOrderNumber,
        });

        // Verify customer order transitioned to completed in Firestore
        const updatedOrderDoc = await db.collection("orders").doc(customerOrderId).get();
        assert.equal(updatedOrderDoc.data()?.status, "completed", "Order must transition to completed");
        assert.equal(updatedOrderDoc.data()?.payment_status, "paid", "Order payment_status must transition to paid");

        // Verify stock was NOT decremented again (remains 12)
        assert.equal(fulfilledResult.quantity, 12, "Stock must NOT be double deducted when fulfilling an existing order");

        // Cleanup customer test order
        await db.collection("orders").doc(customerOrderId).delete();
        await db.collection("order_items").doc("item-" + customerOrderId).delete();

        // 6. Test sellProductService with customer phone
        const testUnregisteredPhone = "9999990001";
        // 6a. Attempting to sell to unregistered phone must reject with CUSTOMER_NOT_FOUND
        await assert.rejects(
          async () => {
            await sellProductService(specialCode, 1, 'test-admin-actor', {
              customer_phone: testUnregisteredPhone,
            });
          },
          { message: 'CUSTOMER_NOT_FOUND' },
          "Selling with unregistered customer phone must be rejected"
        );

        // 6b. Register authorized customer account
        const testCustomerPhone = "98888" + Date.now().toString().slice(-5);
        const registeredCustomer = await createCustomerAccountModel({
          full_name: "Test Authorized Buyer",
          phone: testCustomerPhone,
          email: `test_buyer_${Date.now()}@example.com`,
          password: "Password@123",
        });

        let customerSaleOrderId: string | null = null;
        try {
          // 6c. Now sell product to registered customer
          const customerSaleResult = await sellProductService(specialCode, 2, 'test-admin-actor', {
            customer_phone: testCustomerPhone,
            customer_name: "Test Authorized Buyer",
          });

          customerSaleOrderId = (customerSaleResult as any)?.order?.id;
          assert.ok(customerSaleOrderId, "Order must be created for customer");
          assert.equal(
            (customerSaleResult as any)?.order?.user_id,
            registeredCustomer.id,
            "Order must be linked to the registered customer user ID"
          );

          // 6d. Verify the order appears in the customer's mobile app order list
          const customerOrders = await OrderService.getUserOrders(registeredCustomer.id);
          assert.ok(customerOrders.length > 0, "Customer must have at least 1 order");
          const foundOrder = customerOrders.find((o) => o.id === customerSaleOrderId);
          assert.ok(foundOrder, "Customer order list must contain the quick-sold order");
          assert.equal(foundOrder.status, "completed");
          assert.ok(foundOrder.items && foundOrder.items.length > 0, "Order must contain items");
        } finally {
          if (customerSaleOrderId) {
            await db.collection("orders").doc(customerSaleOrderId).delete();
            const itemsSnap = await db.collection("order_items").where("order_id", "==", customerSaleOrderId).get();
            for (const d of itemsSnap.docs) await db.collection("order_items").doc(d.id).delete();
            const revSnap = await db.collection("revenue_ledger").where("order_id", "==", customerSaleOrderId).get();
            for (const d of revSnap.docs) await db.collection("revenue_ledger").doc(d.id).delete();
          }
          await db.collection("users").doc(registeredCustomer.id).delete();
        }
      } finally {
        // Cleanup all test orders created during sellProductService
        if (soldProductOrderId) {
          await db.collection("orders").doc(soldProductOrderId).delete();
          const itemsSnap = await db.collection("order_items").where("order_id", "==", soldProductOrderId).get();
          for (const itemDoc of itemsSnap.docs) {
            await db.collection("order_items").doc(itemDoc.id).delete();
          }
          const revSnap = await db.collection("revenue_ledger").where("order_id", "==", soldProductOrderId).get();
          for (const revDoc of revSnap.docs) {
            await db.collection("revenue_ledger").doc(revDoc.id).delete();
          }
        }
      }
    } finally {
      // Cleanup
      await db.collection("products").doc(testProdId).delete();
      await db.collection("categories").doc(testCatId).delete();
      await db.collection("model_types").doc(testMtId).delete();
    }
  });
});

