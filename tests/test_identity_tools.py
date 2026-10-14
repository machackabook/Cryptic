#!/usr/bin/env python3
"""Local regression tests for Cryptic SSH key-structure and HULE/LACE tooling."""
import base64
import importlib.util
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
spec = importlib.util.spec_from_file_location("cryptic_key_fragments", SCRIPTS / "cryptic-key-fragments.py")
keys = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = keys
spec.loader.exec_module(keys)

class IdentityToolTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        alg=b"ssh-ed25519"
        pub=bytes(range(32))
        cls.blob=len(alg).to_bytes(4,"big")+alg+len(pub).to_bytes(4,"big")+pub
        cls.b64=base64.b64encode(cls.blob).decode()
        cls.line="ssh-ed25519 "+cls.b64+" test-node"
        cls.fp=keys.fingerprint(cls.blob)

    def test_structural_key_parse_and_fingerprint(self):
        rec=keys.parse_public_line(self.line)
        self.assertIsNotNone(rec)
        self.assertEqual(rec["fingerprint"],self.fp)
        self.assertEqual(rec["type"],"ssh-ed25519")

    def test_wrapped_fragments_reassemble_without_guessing(self):
        wrapped="ssh-ed25519 "+self.b64[:16]+"\n"+self.b64[16:40]+"\n"+self.b64[40:]
        self.assertEqual(keys.fragment_candidates(wrapped,None)[0]["fingerprint"],self.fp)
        self.assertEqual(keys.fragment_candidates("ssh-ed25519 "+self.b64[:-9],None),[])

    def test_unlabelled_wrapped_fragments_require_explicit_key_type(self):
        wrapped=self.b64[:24]+"\n"+self.b64[24:48]+"\n"+self.b64[48:]
        self.assertEqual(keys.fragment_candidates(wrapped,"ssh-ed25519")[0]["fingerprint"],self.fp)

    def test_exact_known_good_inventory_recovers_truncated_public_key(self):
        with tempfile.TemporaryDirectory() as td:
            d=pathlib.Path(td); (d/"fragments.txt").write_text("ssh-ed25519 "+self.b64[:-9])
            (d/"known.pub").write_text(self.line+"\n")
            out=d/"normalized.pub"
            r=subprocess.run([sys.executable,str(SCRIPTS/"cryptic-key-fragments.py"),"--fragments",str(d/"fragments.txt"),"--known-public-key",str(d/"known.pub"),"--expected-fingerprint",self.fp,"--output",str(out)],capture_output=True,text=True)
            self.assertEqual(r.returncode,0,r.stdout+r.stderr)
            self.assertIn("known-good-inventory",r.stdout)
            self.assertEqual(keys.parse_public_line(out.read_text())["fingerprint"],self.fp)

    def test_refuses_to_overwrite_output(self):
        with tempfile.TemporaryDirectory() as td:
            d=pathlib.Path(td); (d/"fragments.txt").write_text(self.line); (d/"out.pub").write_text("KEEP")
            r=subprocess.run([sys.executable,str(SCRIPTS/"cryptic-key-fragments.py"),"--fragments",str(d/"fragments.txt"),"--output",str(d/"out.pub")],capture_output=True,text=True)
            self.assertEqual(r.returncode,3)
            self.assertEqual((d/"out.pub").read_text(),"KEEP")

    def test_hule_round_trip_and_digest_tamper_rejection(self):
        with tempfile.TemporaryDirectory() as td:
            d=pathlib.Path(td); src=d/"in.txt"; env=d/"message.json"; dec=d/"out.txt"
            src.write_text("Cryptic A → ª → Å ZWJ \u200d\n",encoding="utf-8")
            enc=subprocess.run([sys.executable,str(SCRIPTS/"cryptic-lace.py"),"encode",str(src),"--label","test","--output",str(env)],capture_output=True,text=True)
            self.assertEqual(enc.returncode,0,enc.stdout+enc.stderr)
            ver=subprocess.run([sys.executable,str(SCRIPTS/"cryptic-lace.py"),"verify",str(env)],capture_output=True,text=True)
            self.assertEqual(ver.returncode,0,ver.stdout+ver.stderr)
            decp=subprocess.run([sys.executable,str(SCRIPTS/"cryptic-lace.py"),"decode",str(env),"--output",str(dec)],capture_output=True,text=True)
            self.assertEqual(decp.returncode,0,decp.stdout+decp.stderr)
            self.assertEqual(src.read_bytes(),dec.read_bytes())
            obj=json.loads(env.read_text());obj["sha256"]="0"*64;(d/"bad.json").write_text(json.dumps(obj))
            bad=subprocess.run([sys.executable,str(SCRIPTS/"cryptic-lace.py"),"verify",str(d/"bad.json")],capture_output=True,text=True)
            self.assertNotEqual(bad.returncode,0)

if __name__ == "__main__": unittest.main(verbosity=2)
