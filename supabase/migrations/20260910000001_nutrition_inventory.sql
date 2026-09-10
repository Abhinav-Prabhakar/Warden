CREATE TABLE IF NOT EXISTS nutrition_inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  left_pct NUMERIC NOT NULL,
  top_pct NUMERIC NOT NULL,
  width_pct NUMERIC NOT NULL,
  height_pct NUMERIC NOT NULL,
  calories TEXT NOT NULL,
  protein TEXT NOT NULL,
  carbs TEXT NOT NULL,
  dietary TEXT[] NOT NULL DEFAULT '{}',
  location TEXT NOT NULL,
  stock TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE nutrition_inventory ENABLE ROW LEVEL SECURITY;

INSERT INTO nutrition_inventory (id, name, category, left_pct, top_pct, width_pct, height_pct, calories, protein, carbs, dietary, location, stock) VALUES
('roma-tomatoes','Roma Tomatoes','Fresh Produce',27.34,53.19,10.02,7.98,'22 kcal','1.1g','4.8g',ARRAY['Low Potassium','Renal Approved','Diabetic Safe'],'Shelf 4 · Crisper','18 units'),
('cavendish-bananas','Cavendish Bananas','Fresh Fruit',40.1,62.17,9.11,7.98,'89 kcal','1.1g','22.8g',ARRAY['High Potassium','Energy Boost','Soft Texture'],'Shelf 5 · Fruit Bin','24 units'),
('pasteurized-whole-milk','Pasteurized Whole Milk','Dairy & Eggs',78.07,15.29,12.15,12.63,'149 kcal','8.0g','12.0g',ARRAY['Calcium Rich','Vitamin D Fortified'],'Right Door · Top Tier','6 bottles'),
('fresh-garden-carrots','Fresh Garden Carrots','Fresh Produce',56.2,54.52,9.42,6.98,'41 kcal','0.9g','9.6g',ARRAY['Vitamin A Rich','Diabetic Safe'],'Shelf 4 · Center','14 units'),
('sunkist-navel-oranges','Sunkist Navel Oranges','Fresh Fruit',51.03,63.16,10.02,7.31,'62 kcal','1.2g','15.4g',ARRAY['High Vitamin C','Hydrating'],'Shelf 5 · Citrus Bin','12 units'),
('honeycrisp-red-apples','Honeycrisp Red Apples','Fresh Fruit',27.95,63.16,10.33,7.31,'95 kcal','0.5g','25.0g',ARRAY['Fiber Rich','Low Glycemic'],'Shelf 5 · Apple Bin','16 units'),
('savoy-cabbage-greens','Savoy Cabbage & Greens','Fresh Produce',51.64,75.8,18.83,9.64,'25 kcal','1.3g','5.8g',ARRAY['Vitamin K Rich','Anti-Inflammatory'],'Crisper Drawer Right','8 heads'),
('organic-russet-potatoes','Organic Russet Potatoes','Grains & Roots',28.55,75.8,18.23,9.64,'110 kcal','3.0g','26.0g',ARRAY['High Starch','Potassium Source'],'Crisper Drawer Left','22 units'),
('cold-pressed-juices','Cold-Pressed Juices','Beverages',8.51,66.49,12.76,14.63,'110 kcal','1.0g','26.0g',ARRAY['100% Juice','No Added Sugar'],'Left Door · Lower Tier','10 bottles'),
('artisanal-cheese-blocks','Artisanal Cheese Blocks','Dairy & Eggs',54.68,33.24,13.67,5.32,'115 kcal','7.0g','0.4g',ARRAY['High Protein','Gluten Free'],'Shelf 2 · Deli Tier','4 blocks'),
('farm-fresh-grade-a-eggs','Farm Fresh Grade A Eggs','Dairy & Eggs',52.55,22.27,17.31,6.65,'72 kcal','6.3g','0.4g',ARRAY['Complete Protein','Choline Rich'],'Shelf 1 · Top Right','18 eggs'),
('condiments-sauces','Condiments & Sauces','Condiments',8.81,34.91,12.15,9.97,'15 kcal','0.2g','3.5g',ARRAY['Low Calorie','Preserved'],'Left Door · Middle Tier','8 jars'),
('sweet-bell-peppers','Sweet Bell Peppers','Fresh Produce',65.31,54.52,5.16,6.65,'31 kcal','1.0g','6.0g',ARRAY['Vitamin C','Low Sodium'],'Shelf 4 · Right','6 units'),
('whole-wheat-loaf','Whole Wheat Loaf','Bakery',27.95,39.89,9.72,10.64,'80 kcal','4.0g','15.0g',ARRAY['Whole Grain','Dietary Fiber'],'Shelf 3 · Left','2 loaves'),
('greek-yogurt-cups','Greek Yogurt Cups','Dairy & Eggs',77.76,36.57,12.45,6.32,'100 kcal','10.0g','6.0g',ARRAY['Probiotic','Calcium Rich'],'Right Door · Tier 2','8 cups')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, category = EXCLUDED.category, left_pct = EXCLUDED.left_pct,
  top_pct = EXCLUDED.top_pct, width_pct = EXCLUDED.width_pct, height_pct = EXCLUDED.height_pct,
  calories = EXCLUDED.calories, protein = EXCLUDED.protein, carbs = EXCLUDED.carbs,
  dietary = EXCLUDED.dietary, location = EXCLUDED.location, stock = EXCLUDED.stock,
  active = TRUE, updated_at = NOW();

ALTER PUBLICATION supabase_realtime ADD TABLE nutrition_inventory;
