import importlib.util
import pathlib
import tempfile
import unittest

PATH = pathlib.Path(__file__).resolve().parents[1] / "compute.py"
SPEC = importlib.util.spec_from_file_location("compute_v6", PATH)
CORE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CORE)

class ComputeTests(unittest.TestCase):
    def test_genesis_verify_and_change(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            (root/"example.txt").write_text("hello")
            self.assertEqual(CORE.execute(root,"init")["status"],"initialized")
            self.assertEqual(CORE.execute(root,"verify")["status"],"verified")
            (root/"example.txt").write_text("changed")
            self.assertEqual(CORE.execute(root,"status")["status"],"changed")
            with self.assertRaises(ValueError):
                CORE.execute(root,"verify")
            self.assertEqual(CORE.execute(root,"seal")["status"],"sealed")
            self.assertEqual(CORE.execute(root,"verify")["status"],"verified")
    def test_receipt_tampering(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            (root/"a").write_text("first")
            CORE.execute(root,"init")
            ledger = CORE.ledger_path(root)
            ledger.write_text(ledger.read_text().replace("GENESIS","FORGED"))
            with self.assertRaises(ValueError):
                CORE.execute(root,"verify")
    def test_no_symlink_follow(self):
        with tempfile.TemporaryDirectory() as td:
            root = pathlib.Path(td)
            (root/"real").write_text("x")
            (root/"alias").symlink_to(root/"real")
            self.assertEqual(list(CORE.inventory(root)),["real"])
if __name__ == "__main__":
    unittest.main()
