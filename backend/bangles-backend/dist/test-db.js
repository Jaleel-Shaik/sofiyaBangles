"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_1 = require("./config/supabase");
async function test() {
    const result = await supabase_1.pool.query("SELECT NOW()");
    console.log(result.rows);
}
test();
