import sys
import os

# Ensure we are in the correct path to import 'app'
sys.path.append(os.getcwd())

try:
    from app.core.detector import detector
    print("Imports OK")
    
    # Run a test detection
    res = detector.detect("This is a test sentence for plagiarism detection.")
    print("Detection Result keys:", list(res.keys()))
    
    if 'stylometry' in res:
        print("Stylometry OK")
        print("Style Metrics:", res['stylometry'])
    else:
        print("Stylometry Missing")
        
except Exception as e:
    print(f"Verification Failed: {e}")
