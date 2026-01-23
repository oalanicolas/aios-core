#!/usr/bin/env python3
"""
Validate Batch Cascading - REGRA #22 ENFORCEMENT
Verifica se todos os destinos listados em batches foram executados.

CASCATEAMENTO MULTI-DESTINO - A seção "DESTINO DO CONHECIMENTO" não é informativa,
é ordem de execução.

Usage:
    python validate_batch_cascading.py                    # Check all batches
    python validate_batch_cascading.py --batch 128        # Check specific batch
    python validate_batch_cascading.py --verbose          # Detailed output
"""

import os
import re
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Set

PROJECT_ROOT = Path(__file__).parent.parent
BATCHES_PATH = PROJECT_ROOT / "06-LOGS" / "BATCHES"
AGENTS_PATH = PROJECT_ROOT / "05-AGENTS"
PLAYBOOKS_PATH = PROJECT_ROOT / "02-KNOWLEDGE" / "PLAYBOOKS"
DNA_PATH = PROJECT_ROOT / "02-KNOWLEDGE" / "DNA"
DOSSIERS_PATH = PROJECT_ROOT / "02-KNOWLEDGE" / "DOSSIERS"

# Patterns to extract destinations from batch logs
DESTINATION_PATTERNS = [
    r'DESTINO DO CONHECIMENTO[:\s]*([^\n]+)',
    r'→\s*([A-Z-]+(?:\s+[A-Z-]+)?)\s*\((?:agent|playbook|dna|dossier)\)',
    r'Alimenta[r]?:\s*([^\n]+)',
    r'CARGO[s]?\s*Agents?:\s*([^\n]+)',
    r'PERSON\s*Agents?:\s*([^\n]+)',
    r'Theme\s*Dossiers?:\s*([^\n]+)',
]

# Known agent names
KNOWN_AGENTS = {
    "CLOSER", "BDR", "SDS", "LNS", "SALES-MANAGER", "SALES-LEAD",
    "SALES-COORDINATOR", "CUSTOMER-SUCCESS", "NEPQ-SPECIALIST",
    "CRO", "CFO", "CMO", "COO", "PAID-MEDIA-SPECIALIST",
    "JEREMY-HAYNES", "JEREMY-MINER", "COLE-GORDON", "ALEX-HORMOZI",
    "G4-EDUCACAO", "FULL-SALES-SYSTEM", "THE-SCALABLE-COMPANY",
}


class BatchCascadingValidator:
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.issues = []
        self.warnings = []
        self.passed = []

    def log(self, message: str):
        if self.verbose:
            print(f"  {message}")

    def extract_destinations(self, content: str) -> Dict[str, List[str]]:
        """Extract destinations from batch content"""
        destinations = {
            "agents": [],
            "playbooks": [],
            "dnas": [],
            "dossiers": [],
            "raw": []
        }

        # Look for DESTINO DO CONHECIMENTO section
        destino_match = re.search(r'DESTINO DO CONHECIMENTO(.*?)(?:###|\Z)', content, re.DOTALL | re.IGNORECASE)

        if destino_match:
            destino_section = destino_match.group(1)

            # Extract agent mentions
            for agent in KNOWN_AGENTS:
                if agent in destino_section.upper():
                    if agent in ["CRO", "CFO", "CMO", "COO"]:
                        destinations["agents"].append(f"CARGO/{agent}")
                    elif agent in ["JEREMY-HAYNES", "JEREMY-MINER", "COLE-GORDON", "ALEX-HORMOZI", "G4-EDUCACAO", "FULL-SALES-SYSTEM", "THE-SCALABLE-COMPANY"]:
                        destinations["agents"].append(f"PERSONS/{agent}")
                    else:
                        destinations["agents"].append(f"CARGO/SALES/{agent}")

            # Extract playbook mentions
            playbook_matches = re.findall(r'(?:PLAYBOOK|PB)[-_]([A-Z-]+)', destino_section, re.IGNORECASE)
            destinations["playbooks"].extend(playbook_matches)

            # Extract dossier mentions
            dossier_matches = re.findall(r'DOSSIER[-_]([A-Z-]+)', destino_section, re.IGNORECASE)
            destinations["dossiers"].extend(dossier_matches)

            # Store raw section for reference
            destinations["raw"] = destino_section.strip()[:500]

        return destinations

    def check_agent_exists(self, agent_path: str) -> bool:
        """Check if agent exists"""
        # Try multiple paths
        paths_to_check = [
            AGENTS_PATH / agent_path,
            AGENTS_PATH / "CARGO" / agent_path.replace("CARGO/", ""),
            AGENTS_PATH / "PERSONS" / agent_path.replace("PERSONS/", ""),
            AGENTS_PATH / "CARGO" / "SALES" / agent_path.split("/")[-1],
            AGENTS_PATH / "CARGO" / "C-LEVEL" / agent_path.split("/")[-1],
        ]

        for path in paths_to_check:
            if path.exists():
                return True
            # Check if folder with AGENT.md exists
            if (path / "AGENT.md").exists():
                return True

        return False

    def check_cascading_executed(self, batch_content: str, batch_num: int) -> Tuple[bool, List[str]]:
        """Check if cascading section exists in batch"""
        issues = []

        # Check for "Cascateamento Executado" section
        has_cascading_section = "cascateamento executado" in batch_content.lower()

        if not has_cascading_section:
            # Check if destinations were listed
            destinations = self.extract_destinations(batch_content)

            if destinations["agents"] or destinations["playbooks"] or destinations["dossiers"]:
                issues.append(f"BATCH-{batch_num:03d}: Destinos listados mas sem seção 'Cascateamento Executado'")

                # List what should have been cascaded
                if destinations["agents"]:
                    issues.append(f"  Agents não cascateados: {destinations['agents']}")
                if destinations["playbooks"]:
                    issues.append(f"  Playbooks não cascateados: {destinations['playbooks']}")
                if destinations["dossiers"]:
                    issues.append(f"  Dossiers não cascateados: {destinations['dossiers']}")

        return (len(issues) == 0, issues)

    def validate_batch(self, batch_file: Path) -> Dict:
        """Validate a single batch file"""
        batch_name = batch_file.name
        batch_num = int(re.search(r'BATCH-(\d{3})', batch_name).group(1))

        result = {
            "batch": batch_num,
            "file": str(batch_file),
            "destinations": {},
            "cascading_verified": False,
            "issues": []
        }

        try:
            with open(batch_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Extract destinations
            destinations = self.extract_destinations(content)
            result["destinations"] = destinations

            # Check if cascading was executed
            is_valid, issues = self.check_cascading_executed(content, batch_num)
            result["cascading_verified"] = is_valid
            result["issues"] = issues

            if is_valid:
                self.passed.append(f"BATCH-{batch_num:03d}: Cascateamento OK")
            else:
                for issue in issues:
                    self.issues.append(issue)

        except Exception as e:
            result["issues"].append(f"Erro ao ler batch: {e}")
            self.issues.append(f"BATCH-{batch_num:03d}: Erro - {e}")

        return result

    def validate_all(self) -> Dict:
        """Validate all batches"""
        results = {
            "timestamp": datetime.now().isoformat(),
            "total_batches": 0,
            "with_destinations": 0,
            "cascading_verified": 0,
            "issues_found": 0,
            "details": []
        }

        if not BATCHES_PATH.exists():
            return {"error": f"Path not found: {BATCHES_PATH}"}

        batch_files = sorted(BATCHES_PATH.glob("BATCH-*.md"))
        results["total_batches"] = len(batch_files)

        for batch_file in batch_files:
            batch_result = self.validate_batch(batch_file)
            results["details"].append(batch_result)

            if batch_result["destinations"]["agents"] or batch_result["destinations"]["playbooks"] or batch_result["destinations"]["dossiers"]:
                results["with_destinations"] += 1

            if batch_result["cascading_verified"]:
                results["cascading_verified"] += 1
            elif batch_result["issues"]:
                results["issues_found"] += 1

        return results

    def print_report(self, results: Dict):
        """Print validation report"""
        print("\n" + "="*70)
        print("  BATCH CASCADING VALIDATION - REGRA #22 ENFORCEMENT")
        print("  'DESTINO DO CONHECIMENTO = ORDEM DE EXECUÇÃO'")
        print("="*70)

        print(f"\n📊 ESTATÍSTICAS:")
        print(f"   Total batches: {results['total_batches']}")
        print(f"   Com destinos declarados: {results['with_destinations']}")
        print(f"   ✅ Cascateamento verificado: {results['cascading_verified']}")
        print(f"   ❌ Com issues: {results['issues_found']}")

        if self.issues:
            print("\n" + "-"*70)
            print("  ❌ BATCHES SEM CASCATEAMENTO EXECUTADO")
            print("-"*70)

            for issue in self.issues[:20]:
                print(f"\n   {issue}")

            if len(self.issues) > 20:
                print(f"\n   ... e mais {len(self.issues) - 20} issues")

        print("\n" + "="*70)

        if results['issues_found'] == 0:
            print("   ✅ CASCATEAMENTO OK - Todos destinos foram executados")
        else:
            print(f"   ❌ {results['issues_found']} BATCHES com cascateamento pendente")
            print("   AÇÃO: Adicionar seção 'Cascateamento Executado' aos batches")

        print("="*70)

    def print_fix_guide(self):
        """Print guide to fix cascading issues"""
        print("""
COMO CORRIGIR CASCATEAMENTO PENDENTE:

1. Para cada batch com destinos não executados:

2. EXECUTAR CASCATEAMENTO:
   a) Ler seção "DESTINO DO CONHECIMENTO" do batch
   b) Para cada destino:
      - AGENTS: Verificar/criar agent, atualizar MEMORY
      - PLAYBOOKS: Verificar/criar playbook
      - DNAs: Atualizar DNA-CONFIG.yaml
      - DOSSIERS: Atualizar/criar dossier

3. ADICIONAR SEÇÃO AO BATCH:
   ```
   ### ✅ Cascateamento Executado
   - [2026-01-10 15:30] CLOSER: MEMORY atualizada (+3 frameworks)
   - [2026-01-10 15:32] DOSSIER-SHOW-RATES: Atualizado v3.0
   - [2026-01-10 15:35] PLAYBOOK-FOLLOW-UP: Criado
   ```

4. VALIDAR NOVAMENTE:
   python validate_batch_cascading.py --batch XXX
""")


def main():
    parser = argparse.ArgumentParser(description="Validate batch cascading execution")
    parser.add_argument("--batch", type=int, help="Check specific batch number")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--fix", action="store_true", help="Show fix guide")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    validator = BatchCascadingValidator(verbose=args.verbose)

    if args.batch:
        batch_file = BATCHES_PATH / f"BATCH-{args.batch:03d}.md"
        if not batch_file.exists():
            print(f"❌ Batch não encontrado: {batch_file}")
            exit(1)

        result = validator.validate_batch(batch_file)
        print(f"\nBATCH-{args.batch:03d}: {'✅ OK' if result['cascading_verified'] else '❌ PENDENTE'}")

        if result['destinations']['agents']:
            print(f"   Agents: {result['destinations']['agents']}")
        if result['issues']:
            for issue in result['issues']:
                print(f"   • {issue}")

        exit(0 if result['cascading_verified'] else 1)

    results = validator.validate_all()

    if args.json:
        import json
        print(json.dumps(results, indent=2, default=str))
    else:
        validator.print_report(results)
        if args.fix:
            validator.print_fix_guide()

    # Exit with error if issues found
    exit(0 if results.get('issues_found', 0) == 0 else 1)


if __name__ == "__main__":
    main()
