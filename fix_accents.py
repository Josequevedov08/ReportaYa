import os

# Files to fix with their accent corrections
fixes = {
    r'C:\Users\Administrator\Documents\ReportaYa\frontend\index.html': [('alumbrado publico', 'alumbrado público'), ('anonima', 'anónima')],
    r'C:\Users\Administrator\Documents\ReportaYa\frontend\public\manifest.json': [('alumbrado publico', 'alumbrado público'), ('anonima', 'anónima')],
    r'C:\Users\Administrator\Documents\ReportaYa\frontend\src\App.jsx': [('Terminos y Condiciones', 'Términos y Condiciones'), ('Politica de Privacidad', 'Política de Privacidad'), ('Politica de Cookies', 'Política de Cookies'), ('publica.', 'pública.'), ('inautoridad publica', 'inautoridad pública')],
    r'C:\Users\Administrator\Documents\ReportaYa\frontend\src\componentes\IncidentMap.jsx': [('Alumbrado Publico', 'Alumbrado Público')],
    r'C:\Users\Administrator\Documents\ReportaYa\frontend\src\components\ReportForm.jsx': [('Alumbrado Publico', 'Alumbrado Público')],
    r'C:\Users\Administrator\Documents\ReportaYa\frontend\src\types\index.ts': [('Alumbrado Publico', 'Alumbrado Público')],
    r'C:\Users\Administrator\Documents\ReportaYa\frontend\src\components\AdminDashboard.jsx': [('Alumbrado Publico', 'Alumbrado Público')],
}

for path, replacements in fixes.items():
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        for old, new in replacements:
            content = content.replace(old, new)
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✓ Fixed: {os.path.basename(path)}")
    except Exception as e:
        print(f"✗ Error in {path}: {e}")
