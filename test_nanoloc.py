import time
from playwright.sync_api import sync_playwright

def run_tests():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        print("Testing NanoLoc Web UI...")
        
        # 1. Test Navigation to Root (Expect redirect to /login if unauthenticated)
        try:
            print("-> Navigating to root /")
            page.goto('http://localhost:3000')
            page.wait_for_load_state('networkidle')
            
            # Save screenshot
            page.screenshot(path='/tmp/nanoloc_redirected_login.png', full_page=True)
            
            # Check URL
            current_url = page.url
            if '/login' in current_url:
                print("   [PASS] Redirected to /login for unauthenticated user.")
            else:
                print(f"   [FAIL] Expected redirect to /login, but URL is {current_url}")
                
            # 2. Check UI/UX Dark Mode Styling for Login Page
            content = page.content()
            
            # Check for main background
            if 'bg-zinc-900' in content or 'bg-zinc-950' in content:
                print("   [PASS] Found dark mode zinc background classes.")
            else:
                print("   [FAIL] Missing expected bg-zinc classes.")
                
            # Check for primary button (should be bg-zinc-100 or text-zinc-900)
            if 'bg-zinc-100' in content or 'text-zinc-900' in content:
                print("   [PASS] Found minimal primary button styling (zinc-100).")
            else:
                print("   [FAIL] Could not find primary button zinc styling (might still be indigo!).")
                
            # Click "Register" to test client-side routing
            print("-> Clicking Register link")
            register_link = page.locator('a[href="/register"]').first
            if register_link.count() > 0:
                register_link.click()
                page.wait_for_load_state('networkidle')
                page.screenshot(path='/tmp/nanoloc_register.png', full_page=True)
                print("   [PASS] Rendered Register page successfully.")
            else:
                print("   [SKIP] No register link found on login page.")
                
        except Exception as e:
            print(f"   [ERROR] Test failed with exception: {e}")
            
        finally:
            browser.close()
            print("Tests completed.")

if __name__ == "__main__":
    run_tests()
