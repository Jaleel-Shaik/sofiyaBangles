const { execSync } = require('child_process');
execSync('git checkout -- "app/(admin)/edit-product/[id].tsx" "app/(admin)/model-products/[id].tsx"');
const fs = require('fs');
fs.renameSync('app/(admin)/edit-product/[id].tsx', 'app/(admin)/(tabs)/edit-product-[id].tsx');
fs.renameSync('app/(admin)/model-products/[id].tsx', 'app/(admin)/(tabs)/model-products-[id].tsx');
