import re

with open('c:/Users/marcelo/Downloads/deliveryrosas/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Change the title
content = content.replace('<h2 class="section-title-serif">Mais pedidos</h2>', '<h2 class="section-title-serif">Kits e Presentes</h2>')

# Clear the product grid
start_marker = '        <!-- Product Grid -->\n        <div class="product-grid">'
end_marker = '        </div>\n\n    </div>\n\n    <!-- Bottom Navigation -->'

if start_marker in content and end_marker in content:
    before = content.split(start_marker)[0]
    after = content.split(end_marker)[1]
    
    new_grid = start_marker + '\n            <!-- Produtos de kits entrarão aqui -->\n' + end_marker
    new_content = before + new_grid + after
else:
    new_content = content
    print("Could not clear grid")

with open('c:/Users/marcelo/Downloads/deliveryrosas/kits.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
