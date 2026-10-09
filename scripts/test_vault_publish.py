import hashlib, json, tempfile, unittest, sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from vault_publish import publish

class VaultTests(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory();root=Path(self.t.name)
  self.staging=root/'private';self.staging.mkdir();self.site=root/'vault';self.site.mkdir()
  (self.site/'index.html').write_text('<!doctype html>')
  self.data=b'Public test release (not a real production document).'
  (self.staging/'test.txt').write_bytes(self.data)
  self.spec={'schema':'cryptic.public-vault.approval.v1','releases':[{'file':'test.txt','title':'Test release','tdoc_id':'tdoc-test-001',
    'approval_id':'approve-test-001','sha256':hashlib.sha256(self.data).hexdigest(),
    'classification':'public','publication':'approved_public'}]}
  self.manifest=root/'reviewed-private.json'
 def tearDown(self):self.t.cleanup()
 def call(self):
  self.manifest.write_text(json.dumps(self.spec))
  return publish(self.manifest,self.staging,self.site)
 def test_explicit_approval_and_hash(self):
  c=self.call();self.assertEqual(len(c['documents']),1);self.assertTrue((self.site/'assets/test.txt').is_file())
 def test_private_rejected(self):
  self.spec['releases'][0]['classification']='private'
  with self.assertRaises(ValueError):self.call()
 def test_digest_mismatch_rejected(self):
  self.spec['releases'][0]['sha256']='0'*64
  with self.assertRaises(ValueError):self.call()
 def test_path_escape_rejected(self):
  self.spec['releases'][0]['file']='../../stolen.txt'
  with self.assertRaises(ValueError):self.call()
 def test_js_and_html_rejected(self):
  for ext in ['evil.js','bad.html','attack.svg']:
   self.spec['releases'][0]['file']=ext
   with self.assertRaises(ValueError):self.call()
 def test_duplicate_public_filename_rejected(self):
  self.spec['releases'].append(dict(self.spec['releases'][0]))
  with self.assertRaises(ValueError):self.call()
 def test_existing_asset_mutation_rejected(self):
  self.call();(self.site/'assets/test.txt').write_text('changed')
  with self.assertRaises(ValueError):self.call()
 def test_empty_is_allowed(self):
  self.spec['releases']=[]
  self.assertEqual(self.call()['documents'],[])

if __name__=='__main__': unittest.main()