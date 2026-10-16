# Cryptic / HyperTerminal Pages merger - TDOC 12013

Cryptic/main remains the canonical GitHub Pages public source. Public Lite now occupies /Cryptic/terminal/. The advanced React HyperTerminal builds from the pinned public source SHA 10dd456ba74a435908e126c518784fbc871157ce in machackabook/Cryptics-Hyper-Terminal-OS and stages under /Cryptic/terminal/full/.

Tier T0: public read-only local commands and documentation. Tier T1: requires authenticated backend. T2: requires repository permission and signed session. T3: MFA, attested device and independently verified ADAM release gates. Client tier buttons only display information; they are NOT authentication.

Public build never includes the SYNAPSE/aiohttp private backend or Enclave credentials. Source checkout is pinned. Pull request builds test and stage but NEVER deploy. The deploy job runs only after a successful main-branch build AND explicit repository variable NEXUS_PAGES_RELEASE_APPROVED=true. The github-pages environment must have required reviewers. An environment variable is not session provenance.

To activate, after reviewing all gates: open GitHub Settings > Pages and set the publishing source to GitHub Actions. Configure the github-pages deployment environment with required reviewers. As an owner use gh variable set NEXUS_PAGES_RELEASE_APPROVED --body true -R machackabook/Cryptic, only after authorization. Then verify actual deployment and every public UI route.

If GitHub Pages is currently publishing main as source, a merge may update the Public Lite HTML without a compiled React viewer. Only the GitHub Actions build stages the React assets. Do not advertise /terminal/full/ as live until the deployment check passes.

Production promotion also requires frontend unit/build tests, Git history secret scanning, browser link and button probes, protected API denial proof, signed-session provenance, backup and restore verification, independent review, and verified site checks.
