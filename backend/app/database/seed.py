"""Database seeder to provide authentic Kirana demo data matching the reference design."""
from datetime import datetime, timezone, timedelta
from decimal import Decimal
import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.security import hasher
from backend.app.database.models import Customer, Product, Purchase, PurchaseItem, Shop, Transaction, User, new_id

logger = logging.getLogger("khata.seed")


def seed_demo_data(db: Session):
    try:
        # Check if amogh user already exists
        existing = db.scalar(select(User).where(User.email == "amogh@kirana.com"))
        if existing:
            return

        logger.info("Seeding initial Kirana demo data (Sri Ganesh Kirana Stores)...")

        # 1. Demo User
        user = User(
            id=new_id(),
            name="Amogh",
            email="amogh@kirana.com",
            mobile_number="+91 98765 00000",
            password_hash=hasher.hash("password123"),
            created_at=datetime.now(timezone.utc) - timedelta(days=90),
        )
        db.add(user)
        db.flush()

        # 2. Demo Shop (Sri Ganesh Kirana Stores)
        shop = Shop(
            id=new_id(),
            owner_id=user.id,
            shop_name="Sri Ganesh Kirana Stores",
            shop_type="Kirana",
            address="Gandhi Bazaar, Main Market",
            city="Bangalore",
            state="Karnataka",
            contact_number="+91 98765 00000",
            preferred_language="en",
            created_at=datetime.now(timezone.utc) - timedelta(days=90),
        )
        db.add(shop)
        db.flush()

        # 3. Standard Products
        products_data = [
            ("Rice (Basmati)", "kg", "60.00", "Grains & Staples"),
            ("Sugar", "kg", "45.00", "Grains & Staples"),
            ("Tea (Tata Premium)", "pack", "230.00", "Beverages"),
            ("Milk (Nandini)", "L", "36.00", "Dairy"),
            ("Bread (White)", "loaf", "34.00", "Bakery"),
            ("Eggs (Farm Fresh)", "dozen", "72.00", "Dairy & Eggs"),
            ("Wheat Flour (Aashirvaad)", "kg", "45.00", "Grains & Staples"),
            ("Cooking Oil (Sunflower)", "L", "180.00", "Oils & Ghee"),
            ("Toor Dal", "kg", "160.00", "Pulses & Dal"),
            ("Soap (Lux)", "piece", "35.00", "Personal Care"),
            ("Detergent (Surf Excel)", "kg", "160.00", "Cleaning"),
        ]
        created_products = {}
        for name, unit, price, category in products_data:
            p = Product(
                id=new_id(),
                shop_id=shop.id,
                product_name=name,
                price=Decimal(price),
                catalog_details={"unit": unit, "category": category},
            )
            db.add(p)
            created_products[name] = p
        db.flush()

        # 4. Primary Customer: Ramesh Kumar (matches user's reference image exactly)
        # Total Purchases: 12,430.00
        # Total Payments: 8,000.00
        # Balance: 4,430.00 (Outstanding Udhar)
        ramesh = Customer(
            id=new_id(),
            shop_id=shop.id,
            customer_name="Ramesh Kumar",
            mobile_number="+91 98765 43210",
            address="Cross Road 4, Bangalore",
            notes="Regular customer since 2024",
            created_at=datetime.now(timezone.utc) - timedelta(days=60),
        )
        db.add(ramesh)
        db.flush()

        # Other realistic customers
        suresh = Customer(
            id=new_id(),
            shop_id=shop.id,
            customer_name="Suresh Patel",
            mobile_number="+91 98111 22334",
            address="Flat 102, Shanti Apts",
            notes="Prompt monthly payer",
            created_at=datetime.now(timezone.utc) - timedelta(days=45),
        )
        anita = Customer(
            id=new_id(),
            shop_id=shop.id,
            customer_name="Anita Sharma",
            mobile_number="+91 97222 33445",
            address="Sector 2, Near Temple",
            notes="Settled all dues",
            created_at=datetime.now(timezone.utc) - timedelta(days=30),
        )
        db.add_all([suresh, anita])
        db.flush()

        # 5. Purchases matching reference image for Ramesh Kumar
        # Row 1: 25 Jan 2025, 10:24 AM - Rice (5 kg), Sugar (2 kg), Tea (250 g) -> Rs 620.00
        # Row 2: 22 Jan 2025, 6:15 PM - Milk (1 L), Bread (1), Eggs (12) -> Rs 142.00
        # Row 3: 20 Jan 2025, 11:02 AM - Wheat Flour (10 kg), Oil (1 L), Toor Dal (1 kg) -> Rs 1,250.00
        # Row 4: 18 Jan 2025, 5:40 PM - Soap (2), Detergent (1 kg) -> Rs 230.00

        bills = [
            {
                "date": datetime(2025, 1, 25, 10, 24, 0, tzinfo=timezone.utc),
                "total": Decimal("620.00"),
                "items": [
                    ("Rice", "5", "kg", Decimal("60.00"), Decimal("300.00")),
                    ("Sugar", "2", "kg", Decimal("45.00"), Decimal("90.00")),
                    ("Tea", "250", "g", Decimal("230.00"), Decimal("230.00")),
                ],
            },
            {
                "date": datetime(2025, 1, 22, 18, 15, 0, tzinfo=timezone.utc),
                "total": Decimal("142.00"),
                "items": [
                    ("Milk", "1", "L", Decimal("36.00"), Decimal("36.00")),
                    ("Bread", "1", "loaf", Decimal("34.00"), Decimal("34.00")),
                    ("Eggs", "12", "pcs", Decimal("6.00"), Decimal("72.00")),
                ],
            },
            {
                "date": datetime(2025, 1, 20, 11, 2, 0, tzinfo=timezone.utc),
                "total": Decimal("1250.00"),
                "items": [
                    ("Wheat Flour", "10", "kg", Decimal("45.00"), Decimal("450.00")),
                    ("Oil", "1", "L", Decimal("180.00"), Decimal("180.00")),
                    ("Toor Dal", "1", "kg", Decimal("160.00"), Decimal("160.00")),
                    ("Spices & Masala", "1", "pack", Decimal("460.00"), Decimal("460.00")),
                ],
            },
            {
                "date": datetime(2025, 1, 18, 17, 40, 0, tzinfo=timezone.utc),
                "total": Decimal("230.00"),
                "items": [
                    ("Soap", "2", "pcs", Decimal("35.00"), Decimal("70.00")),
                    ("Detergent", "1", "kg", Decimal("160.00"), Decimal("160.00")),
                ],
            },
        ]

        for b in bills:
            p_id = new_id()
            txn_id = new_id()

            # Ledger Credit Transaction
            txn = Transaction(
                id=txn_id,
                shop_id=shop.id,
                customer_id=ramesh.id,
                transaction_type="credit",
                direction=1,
                amount=b["total"],
                description=f"Purchase Bill - {len(b['items'])} items",
                idempotency_key=f"purchase:{p_id}",
                request_fingerprint="seed",
                created_by=user.id,
                created_at=b["date"],
            )
            db.add(txn)

            # Purchase Record
            purchase = Purchase(
                id=p_id,
                shop_id=shop.id,
                customer_id=ramesh.id,
                purchased_at=b["date"],
                total=b["total"],
                payment_method="khata",
                credit_transaction_id=txn_id,
                created_by=user.id,
                idempotency_key=f"init:{p_id}",
                request_fingerprint="seed",
            )
            db.add(purchase)

            for pos, (i_name, i_qty, i_unit, i_price, i_line_tot) in enumerate(b["items"], start=1):
                item = PurchaseItem(
                    purchase_id=p_id,
                    shop_id=shop.id,
                    position=pos,
                    product_name=i_name,
                    quantity=Decimal(i_qty),
                    unit=i_unit,
                    unit_price=i_price,
                    line_total=i_line_tot,
                )
                db.add(item)

        # 6. Prior History to reach exact Total Purchases = 12,430 and Total Payments = 8,000
        # Earlier purchases totaling 12,430 - (620 + 142 + 1250 + 230 = 2,242) = 10,188
        prior_p_id = new_id()
        prior_txn_id = new_id()
        prior_date = datetime(2025, 1, 5, 14, 0, 0, tzinfo=timezone.utc)

        db.add(Transaction(
            id=prior_txn_id,
            shop_id=shop.id,
            customer_id=ramesh.id,
            transaction_type="credit",
            direction=1,
            amount=Decimal("10188.00"),
            description="Opening Grocery Purchase Balance",
            idempotency_key=f"purchase:{prior_p_id}",
            request_fingerprint="seed_prior_tx",
            created_by=user.id,
            created_at=prior_date,
        ))
        db.add(Purchase(
            id=prior_p_id,
            shop_id=shop.id,
            customer_id=ramesh.id,
            purchased_at=prior_date,
            total=Decimal("10188.00"),
            payment_method="khata",
            credit_transaction_id=prior_txn_id,
            created_by=user.id,
            idempotency_key=f"init:{prior_p_id}",
            request_fingerprint="seed_prior",
        ))
        db.add(PurchaseItem(
            purchase_id=prior_p_id,
            shop_id=shop.id,
            position=1,
            product_name="Monthly Ration (Rice, Oil, Spices, Ghee)",
            quantity=Decimal("1"),
            unit="pack",
            unit_price=Decimal("10188.00"),
            line_total=Decimal("10188.00"),
        ))

        # Payment Transaction: Rs 8,000 Jama
        payment_date = datetime(2025, 1, 15, 16, 30, 0, tzinfo=timezone.utc)
        db.add(Transaction(
            id=new_id(),
            shop_id=shop.id,
            customer_id=ramesh.id,
            transaction_type="payment",
            direction=-1,
            amount=Decimal("8000.00"),
            description="Payment received via UPI (GPay)",
            idempotency_key=f"pay:{new_id()}",
            request_fingerprint="seed_pay",
            created_by=user.id,
            created_at=payment_date,
        ))

        db.commit()
        logger.info("Demo Kirana data seeded successfully! (Ramesh Kumar balance: Rs 4,430.00)")
    except Exception as e:
        db.rollback()
        logger.warning("Could not seed demo data: %s", e)
