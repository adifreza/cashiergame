from typing import Dict, Protocol
import datetime

class StoreManager:
    def __init__(self):
        self.products = {
            1: {"name": "Game A", "type": "standard", "price": 100},
            2: {"name": "Game B", "type": "deluxe", "price": 200},
            3: {"name": "Game C", "type": "collector", "price": 500},
        }
        self.stock = {1: 10, 2: 5, 3: 2}
        self.orders = []

    def list_products(self):
        print("Daftar produk:")
        for pid, info in self.products.items():
            print(f"{pid}. {info['name']} - Rp{info['price']} (stok: {self.stock.get(pid, 0)})")

    def calculate_price(self, product_id: int, quantity: int) -> int:
        info = self.products[product_id]
        base = info["price"] * quantity

        if info["type"] == "standard":
            return base
        elif info["type"] == "deluxe":
            return int(base * 0.9)
        elif info["type"] == "collector":
            return int(base * 0.8)
        else:
            return base

    def create_order(self, customer_name: str, product_id: int, quantity: int) -> Dict:
        if self.stock.get(product_id, 0) < quantity:
            raise ValueError("Stok tidak cukup")

        self.stock[product_id] -= quantity
        total = self.calculate_price(product_id, quantity)

        order = {
            "id": len(self.orders) + 1,
            "customer": customer_name,
            "product_id": product_id,
            "quantity": quantity,
            "total": total,
            "date": datetime.datetime.now(),
        }
        self.orders.append(order)

        with open("orders_db.txt", "a", encoding="utf-8") as f:
            f.write(str(order) + "\n")

        return order

    def print_receipt(self, order: Dict):
        prod = self.products[order["product_id"]]
        print("\n==== STRUK PEMBELIAN ====")
        print(f"Order ID: {order['id']}")
        print(f"Nama: {order['customer']}")
        print(f"Produk: {prod['name']}")
        print(f"Jumlah: {order['quantity']}")
        print(f"Total: Rp{order['total']}")
        print("Terima kasih telah berbelanja!")

class ProductCatalogInterface(Protocol):
    # Interface kecil khusus katalog.
    def add_product(self, product: Dict):
        ...


class SalesRecordInterface(Protocol):
    # Interface kecil khusus pencatatan penjualan.
    def record_sale(self, order: Dict):
        ...


class MiniKiosk(ProductCatalogInterface, SalesRecordInterface):
    # Kiosk hanya implement interface yang memang dia butuhkan.
    def __init__(self):
        self.products: Dict[int, Dict] = {}
        self.sales = []

    def add_product(self, product: Dict):
        product_id = product.get("id")
        if product_id is None:
            raise ValueError("Product harus punya field 'id'")
        self.products[product_id] = product

    def record_sale(self, order: Dict):
        self.sales.append(order)

class EmailNotifier:
    def send(self, to: str, message: str):
        print(f"Mengirim email ke {to}: {message}")


class ConcreteDB:
    def save(self, data: Dict):
        with open("lowlevel_db.txt", "a", encoding="utf-8") as f:
            f.write(str(data) + "\n")


class OrderService:
    def __init__(self):
        self.notifier = EmailNotifier()
        self.db = ConcreteDB()

    def process(self, order: Dict):
        self.db.save(order)
        self.notifier.send(order["customer"], f"Order {order['id']} sukses!")

def run_demo_bad():
    print("=== Demo: Sistem Kasir (versi salah/non-SOLID) ===")
    manager = StoreManager()
    order_service = OrderService()

    while True:
        manager.list_products()
        try:
            pid = int(input("Pilih product id (0 untuk keluar): ").strip())
        except Exception:
            print("Input tidak valid")
            continue

        if pid == 0:
            break

        if pid not in manager.products:
            print("Produk tidak ditemukan")
            continue

        try:
            qty = int(input("Jumlah: ").strip())
        except Exception:
            print("Input tidak valid")
            continue

        name = input("Nama pembeli: ").strip() or "Anonim"

        try:
            order = manager.create_order(name, pid, qty)
            manager.print_receipt(order)
            order_service.process(order)
        except Exception as e:
            print("Gagal membuat order:", e)

    print("Demo versi salah selesai.")


if __name__ == "__main__":
    run_demo_bad()
