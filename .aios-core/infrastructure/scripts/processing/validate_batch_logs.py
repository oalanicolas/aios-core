#!/usr/bin/env python3
"""
Validate Batch Logs - REGRA #8 ENFORCEMENT
Verifica se todos os batches têm logs em DUAL-LOCATION.

LOGGING OBRIGATÓRIO - Todo processamento gera log. Sem exceções.
DUAL-LOCATION: /06-LOGS/BATCHES/ + /.claude/mission-control/BATCH-LOGS/

Usage:
    python validate_batch_logs.py                    # Check all batches
    python validate_batch_logs.py --batch 128        # Check specific batch
    python validate_batch_logs.py --fix              # Show missing logs
"""

import os
import re
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional

PROJECT_ROOT = Path(__file__).parent.parent
BATCHES_LOG_PATH = PROJECT_ROOT / "06-LOGS" / "BATCHES"
CLAUDE_BATCH_PATH = PROJECT_ROOT / ".claude" / "mission-control" / "BATCH-LOGS"
MISSION_STATE_PATH = PROJECT_ROOT / ".claude" / "mission-control" / "MISSION-STATE.json"

# Batch filename patterns
BATCH_MD_PATTERN = re.compile(r'BATCH-(\d{3})\.md')
BATCH_JSON_PATTERN = re.compile(r'BATCH-(\d{3})-([A-Z]{2})\.json')


class BatchLogValidator:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.passed = []
        self.batches_found = {}  # batch_num -> {md: bool, json: bool, source: str}

    def scan_batch_logs(self) -> Dict[int, Dict]:
        """Scan both log locations"""
        batches = {}

        # Scan /06-LOGS/BATCHES/ for .md files
        if BATCHES_LOG_PATH.exists():
            for f in BATCHES_LOG_PATH.glob("BATCH-*.md"):
                match = BATCH_MD_PATTERN.match(f.name)
                if match:
                    batch_num = int(match.group(1))
                    if batch_num not in batches:
                        batches[batch_num] = {"md": False, "json": False, "source": ""}
                    batches[batch_num]["md"] = True
                    batches[batch_num]["md_path"] = str(f)

        # Scan /.claude/mission-control/BATCH-LOGS/ for .json files
        if CLAUDE_BATCH_PATH.exists():
            for f in CLAUDE_BATCH_PATH.glob("BATCH-*.json"):
                match = BATCH_JSON_PATTERN.match(f.name)
                if match:
                    batch_num = int(match.group(1))
                    source = match.group(2)
                    if batch_num not in batches:
                        batches[batch_num] = {"md": False, "json": False, "source": ""}
                    batches[batch_num]["json"] = True
                    batches[batch_num]["json_path"] = str(f)
                    batches[batch_num]["source"] = source

        self.batches_found = batches
        return batches

    def get_expected_batches(self) -> int:
        """Get expected number of batches from MISSION-STATE"""
        if MISSION_STATE_PATH.exists():
            import json
            try:
                with open(MISSION_STATE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return data.get("phases", {}).get("4_pipeline", {}).get("batches_total", 0)
            except:
                pass
        return 0

    def validate_batch(self, batch_num: int) -> Tuple[bool, List[str]]:
        """Validate a specific batch has dual-location logs"""
        issues = []

        batch_info = self.batches_found.get(batch_num, {"md": False, "json": False})

        if not batch_info.get("md"):
            issues.append(f"BATCH-{batch_num:03d}.md não encontrado em /06-LOGS/BATCHES/")

        if not batch_info.get("json"):
            issues.append(f"BATCH-{batch_num:03d}-XX.json não encontrado em /.claude/mission-control/BATCH-LOGS/")

        return (len(issues) == 0, issues)

    def validate_all(self) -> Dict:
        """Validate all batches"""
        self.scan_batch_logs()
        expected = self.get_expected_batches()

        results = {
            "expected_batches": expected,
            "found_batches": len(self.batches_found),
            "complete_dual_location": 0,
            "md_only": 0,
            "json_only": 0,
            "missing_both": 0,
            "issues": []
        }

        # Check each expected batch
        for batch_num in range(1, expected + 1):
            is_valid, issues = self.validate_batch(batch_num)

            if is_valid:
                results["complete_dual_location"] += 1
                self.passed.append(f"BATCH-{batch_num:03d}: Dual-location OK")
            else:
                batch_info = self.batches_found.get(batch_num, {})
                if batch_info.get("md") and not batch_info.get("json"):
                    results["md_only"] += 1
                elif batch_info.get("json") and not batch_info.get("md"):
                    results["json_only"] += 1
                else:
                    results["missing_both"] += 1

                for issue in issues:
                    self.issues.append(issue)
                    results["issues"].append({"batch": batch_num, "issue": issue})

        return results

    def print_report(self, results: Dict):
        """Print validation report"""
        print("\n" + "="*70)
        print("  BATCH LOGS VALIDATION - REGRA #8 ENFORCEMENT")
        print("  'LOGGING OBRIGATÓRIO - dual-location sempre'")
        print("="*70)

        print(f"\n📊 ESTATÍSTICAS:")
        print(f"   Batches esperados: {results['expected_batches']}")
        print(f"   Batches encontrados: {results['found_batches']}")
        print(f"   ✅ Dual-location completo: {results['complete_dual_location']}")
        print(f"   ⚠️  Apenas .md: {results['md_only']}")
        print(f"   ⚠️  Apenas .json: {results['json_only']}")
        print(f"   ❌ Faltando ambos: {results['missing_both']}")

        if results['md_only'] > 0 or results['json_only'] > 0 or results['missing_both'] > 0:
            print("\n" + "-"*70)
            print("  ❌ BATCHES COM LOGS INCOMPLETOS")
            print("-"*70)

            # Group by issue type
            md_missing = []
            json_missing = []
            both_missing = []

            for batch_num, info in sorted(self.batches_found.items()):
                if info.get("md") and not info.get("json"):
                    json_missing.append(batch_num)
                elif info.get("json") and not info.get("md"):
                    md_missing.append(batch_num)

            # Find batches missing both
            for batch_num in range(1, results['expected_batches'] + 1):
                if batch_num not in self.batches_found:
                    both_missing.append(batch_num)

            if md_missing:
                print(f"\n   Faltando .md (tem .json): {md_missing}")
            if json_missing:
                print(f"   Faltando .json (tem .md): {json_missing}")
            if both_missing:
                print(f"   Faltando ambos: {both_missing}")

        print("\n" + "="*70)

        total_issues = results['md_only'] + results['json_only'] + results['missing_both']
        if total_issues == 0:
            print("   ✅ TODOS OS BATCHES TÊM DUAL-LOCATION LOGS")
        else:
            print(f"   ❌ {total_issues} BATCHES COM LOGS INCOMPLETOS")
            print("   AÇÃO: Criar logs faltantes antes de continuar")

        print("="*70)

    def print_fix_guide(self):
        """Print guide to fix missing logs"""
        print("\n" + "="*70)
        print("  COMO CORRIGIR LOGS FALTANTES")
        print("="*70)

        print("""
ESTRUTURA DUAL-LOCATION OBRIGATÓRIA:

1. /06-LOGS/BATCHES/BATCH-XXX.md
   - Log visual completo com ASCII art
   - Template V2 com todas as 14 seções
   - Frameworks, heurísticas, metodologias

2. /.claude/mission-control/BATCH-LOGS/BATCH-XXX-YY.json
   - Log estruturado em JSON
   - YY = código da fonte (JH, JM, CG, etc.)
   - Usado para automação e queries

PARA CRIAR LOGS FALTANTES:

1. Identificar batch incompleto
2. Ler arquivos processados no batch
3. Gerar log .md seguindo template
4. Gerar log .json com dados estruturados
5. Validar novamente com este script

Script de geração (se existir):
   python generate_batch_log.py --batch XXX
""")


def main():
    parser = argparse.ArgumentParser(description="Validate batch logs dual-location")
    parser.add_argument("--batch", type=int, help="Check specific batch number")
    parser.add_argument("--fix", action="store_true", help="Show fix guide")
    parser.add_argument("--json", action="store_true", help="Output as JSON")

    args = parser.parse_args()

    validator = BatchLogValidator()

    if args.batch:
        validator.scan_batch_logs()
        is_valid, issues = validator.validate_batch(args.batch)
        print(f"\nBATCH-{args.batch:03d}: {'✅ OK' if is_valid else '❌ INCOMPLETO'}")
        for issue in issues:
            print(f"   • {issue}")
        exit(0 if is_valid else 1)

    results = validator.validate_all()

    if args.json:
        import json
        print(json.dumps(results, indent=2, default=str))
    else:
        validator.print_report(results)
        if args.fix:
            validator.print_fix_guide()

    # Exit with error if issues found
    total_issues = results['md_only'] + results['json_only'] + results['missing_both']
    exit(0 if total_issues == 0 else 1)


if __name__ == "__main__":
    main()
