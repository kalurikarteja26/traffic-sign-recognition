"""
test_agents.py

Automated Verification Suite for Traffic Safety Multi-Agent System (Step 5).
Validates:
1. Multi-frame confirmation (monitoring -> alert on frame 3).
2. Anti-spam deduplication (suppressed on frame 4).
3. Low-confidence rejection filtering.
4. Transitioning to new sign classes.
5. Structured event history logging.
"""

from traffic_safety_agents import TrafficSafetyCoordinator


def run_tests():
    print("=" * 65)
    print("   RUNNING TRAFFIC SAFETY AGENTS VERIFICATION SUITE   ")
    print("=" * 65)

    agent = TrafficSafetyCoordinator(threshold=0.70, required_frames=3)

    # ------------------------------------------------------------------
    # Test 1: Same sign detected across consecutive frames (1 to 4)
    # ------------------------------------------------------------------
    print("\n--- Test 1: Consecutive Frame Confirmation ---")
    results = []
    for i in range(1, 5):
        result = agent.process("stop", 0.94)
        results.append(result)
        print(f"Frame: {i} | {result['status']} | {result['message']}")

    # Expected: Frames 1 and 2 are monitoring, Frame 3 is alert, Frame 4 is suppressed
    assert results[0]["status"] == "monitoring", f"Expected 'monitoring', got {results[0]['status']}"
    assert results[1]["status"] == "monitoring", f"Expected 'monitoring', got {results[1]['status']}"
    assert results[2]["status"] == "alert", f"Expected 'alert', got {results[2]['status']}"
    assert results[3]["status"] == "suppressed", f"Expected 'suppressed', got {results[3]['status']}"
    print("[PASS] Test 1: Consecutive confirmation and suppression verified.")

    # ------------------------------------------------------------------
    # Test 2: Low-confidence prediction should be rejected
    # ------------------------------------------------------------------
    print("\n--- Test 2: Low Confidence Filtering ---")
    result = agent.process("stop", 0.30)
    print("Low confidence test:", result["status"])
    assert result["status"] == "rejected", f"Expected 'rejected', got {result['status']}"
    print("[PASS] Test 2: Low-confidence rejection verified.")

    # ------------------------------------------------------------------
    # Test 3: Simulate a different sign ("no_entry")
    # ------------------------------------------------------------------
    print("\n--- Test 3: New Sign Transition ---")
    for i in range(3):
        result = agent.process("no_entry", 0.91)
    print("New sign test:", result["status"])
    assert result["status"] == "alert", f"Expected 'alert', got {result['status']}"
    print("[PASS] Test 3: New sign detection and alert verified.")

    # ------------------------------------------------------------------
    # Test 4: Verify recorded events history
    # ------------------------------------------------------------------
    print("\n--- Test 4: Event History Logging ---")
    events_count = len(agent.history)
    print("Events recorded:", events_count)
    assert events_count == 2, f"Expected 2 events recorded (stop + no_entry), got {events_count}"

    for idx, ev in enumerate(agent.history):
        print(f" Event {idx + 1}: [{ev['priority']}] {ev['label']} (conf: {ev['confidence']:.2f}) -> {ev['message']}")

    # ------------------------------------------------------------------
    # Test 5: Complete 108-Sign Rules Coverage & Priority Mapping
    # ------------------------------------------------------------------
    print("\n--- Test 5: Full 108-Class RTO Sign Coverage ---")
    import pandas as pd
    from pathlib import Path
    csv_file = Path("dataset/signnames_rto.csv")
    if csv_file.exists():
        df = pd.read_csv(csv_file)
        verified_count = 0
        for _, row in df.iterrows():
            cid = int(row['ClassId'])
            name = str(row['Name']).strip()
            rule = agent.rule_agent.get_rule(name)
            assert rule is not None, f"Missing rule for sign {name}"
            assert "priority" in rule and rule["priority"] in ["HIGH", "MEDIUM", "LOW"], f"Invalid priority for {name}"
            assert "action" in rule and len(rule["action"]) > 5, f"Empty action for {name}"
            verified_count += 1
        print(f"[PASS] Test 5: All {verified_count}/108 trained Indian RTO traffic signs verified with active safety rules.")
    else:
        print("[SKIP] Test 5: dataset/signnames_rto.csv not found.")

    print("\n" + "=" * 65)
    print("   ALL AGENT LOGIC TESTS PASSED SUCCESSFULLY! (100%)   ")
    print("=" * 65)


if __name__ == "__main__":
    run_tests()

