# Purchase Data Backup & Restore

## Urdu/English Instructions

### Backup Karna (Data Backup)

Purchase data ka backup lene ke liye:

```bash
npm run backup:purchases
```

Ye command:
- Saare purchases aur purchase orders ko database se nikalegi
- `backups/` folder mein JSON files create karegi
- Teen files banegi:
  1. `purchases_[timestamp].json` - Sirf purchases
  2. `purchase-orders_[timestamp].json` - Sirf purchase orders  
  3. `all-purchases_[timestamp].json` - Sab kuch combined

### Restore Karna (Data Wapis Daalna)

Backup ko wapis database mein daalne ke liye:

```bash
npm run restore:purchases all-purchases_2026-04-30T11-30-00-000Z.json
```

**Note:** Apni backup file ka correct naam use karein jo `backups/` folder mein hai.

---

## English Instructions

### Creating a Backup

To backup purchase data from database:

```bash
npm run backup:purchases
```

This command will:
- Export all purchases and purchase orders from MongoDB
- Create JSON files in the `backups/` folder
- Generate 3 files:
  1. `purchases_[timestamp].json` - Only purchases
  2. `purchase-orders_[timestamp].json` - Only purchase orders
  3. `all-purchases_[timestamp].json` - Combined backup

### Restoring from Backup

To restore data back to database:

```bash
npm run restore:purchases all-purchases_2026-04-30T11-30-00-000Z.json
```

**Note:** Use the correct backup file name from your `backups/` folder.

---

## Important Notes / Zaruri Batein

- ✅ Har backup mein timestamp hota hai (date aur time)
- ✅ Script duplicate entries skip kar degi
- ✅ Backup files Git mein commit nahi hongi (.gitignore mein hai)
- ⚠️ Pehle backup zarur lein before making changes
- ⚠️ Always take a backup before making database changes

## Troubleshooting

Agar koi error aaye:
1. Check karein ke MongoDB URI `.env` file mein correct hai
2. Check karein ke `npm install` run kiya hai
3. Backup file name check karein (typo na ho)

If you get errors:
1. Verify MongoDB URI in `.env` file is correct
2. Ensure you've run `npm install`
3. Double-check the backup file name (no typos)
