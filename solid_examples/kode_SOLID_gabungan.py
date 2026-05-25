from typing import Dict, Protocol
import datetime

class Inventory:
    def __init__(self, products: Dict[int, "Product"], stock: Dict[int, int]):
        self._products = products
        self._stock = stock

    def list_products(self):
        print("Daftar produk:")
        for pid, p in self._products.items():
            print(f"{pid}. {p.name} - Rp{p.price} (stok: {self._stock.get(pid, 0)})")

    def reserve(self, product_id: int, qty: int):
        if self._stock.get(product_id, 0) < qty:
            raise ValueError("Stok tidak cukup")
        self._stock[product_id] -= qty

    def get_product(self, product_id: int) -> "Product":
        if product_id not in self._products:
            raise ValueError("Produk tidak ditemukan")
        return self._products[product_id]


class ReceiptPrinter:
    def print_receipt(self, order: Dict, product: "Product"):
        print("\n==== STRUK PEMBELIAN (FIXED) ====")
        print(f"Order ID: {order['id']}")
        print(f"Nama: {order['customer']}")
        print(f"Produk: {product.name}")
        print(f"Jumlah: {order['quantity']}")
        print(f"Total: Rp{order['total']}")
        print("Terima kasih telah berbelanja!")
class PriceStrategy(Protocol):
    def final_price(self, base_price: int, qty: int) -> int:
        ...


class StandardPrice:
    def final_price(self, base_price: int, qty: int) -> int:
        return base_price * qty


class DeluxePrice:
    def final_price(self, base_price: int, qty: int) -> int:
        return int(base_price * qty * 0.9)


class CollectorPrice:
    def final_price(self, base_price: int, qty: int) -> int:
        return int(base_price * qty * 0.8)


class Product:
    def __init__(self, product_id: int, name: str, price: int, strategy: PriceStrategy):
        self.id = product_id
        self.name = name
        self.price = price
        self.strategy = strategy

    def final_price(self, qty: int) -> int:
        return self.strategy.final_price(self.price, qty)
class ProductCatalogInterface(Protocol):
    def add_product(self, product: Product):
        ...


class SalesRecordInterface(Protocol):
    def record_sale(self, order: Dict):
        ...


class MiniKiosk(ProductCatalogInterface, SalesRecordInterface):
    def __init__(self):
        self.products: Dict[int, Product] = {}
        self.sales = []

    def add_product(self, product: Product):
        self.products[product.id] = product

    def record_sale(self, order: Dict):
        self.sales.append(order)
class OrderRepository(Protocol):
    def save(self, order: Dict):
        ...


class Notifier(Protocol):
    def send(self, to: str, message: str):
        ...


class FileOrderRepository:
    def __init__(self, path: str = "orders_fixed_db.txt"):
        self._path = path

    def save(self, order: Dict):
        with open(self._path, "a", encoding="utf-8") as f:
            f.write(str(order) + "\n")


class EmailNotifier:
    def send(self, to: str, message: str):
        print(f"[Email] ke {to}: {message}")


class OrderService:
    def __init__(self, repo: OrderRepository, notifier: Notifier):
        self.repo = repo
        self.notifier = notifier
        self._sequence = 0

    def create_order(self, customer: str, product: Product, qty: int) -> Dict:
        self._sequence += 1
        total = product.final_price(qty)
        order = {
            "id": self._sequence,
            "customer": customer,
            "product_id": product.id,
            "quantity": qty,
            "total": total,
            "date": datetime.datetime.now(),
        }
        self.repo.save(order)
        self.notifier.send(customer, f"Order {order['id']} berhasil dibuat")
        return order
def build_default_products() -> Dict[int, Product]:
    return {
        1: Product(1, "Game A", 100, StandardPrice()),
        2: Product(2, "Game B", 200, DeluxePrice()),
        3: Product(3, "Game C", 500, CollectorPrice()),
    }


def run_demo_fixed():
    print("=== Demo: Sistem Kasir (versi fixed/SOLID) ===")

    products = build_default_products()
    stock = {1: 10, 2: 5, 3: 2}

    inventory = Inventory(products, stock)
    printer = ReceiptPrinter()
    repo = FileOrderRepository()
    notifier = EmailNotifier()
    service = OrderService(repo, notifier)

    while True:
        inventory.list_products()
        try:
            pid = int(input("Pilih product id (0 untuk keluar): ").strip())
        except Exception:
            print("Input tidak valid")
            continue

        if pid == 0:
            break

        try:
            qty = int(input("Jumlah: ").strip())
        except Exception:
            print("Input tidak valid")
            continue

        customer = input("Nama pembeli: ").strip() or "Anonim"

        try:
            product = inventory.get_product(pid)
            inventory.reserve(pid, qty)
            order = service.create_order(customer, product, qty)
            printer.print_receipt(order, product)
        except Exception as e:
            print("Gagal membuat order:", e)

    print("Demo versi fixed selesai.")


if __name__ == "__main__":
    run_demo_fixed()
