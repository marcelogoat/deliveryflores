import re

with open('c:/Users/marcelo/Downloads/deliveryrosas/index.html', 'r', encoding='utf-8') as f:
    idx_content = f.read()

with open('c:/Users/marcelo/Downloads/deliveryrosas/produto.html', 'r', encoding='utf-8') as f:
    prod_content = f.read()

# Extract CSS
css_match = re.search(r'(        /\* Product Grid \*/.*?)(?=        /\* Bottom Navigation \*/)', idx_content, re.DOTALL)
if css_match:
    prod_content = prod_content.replace('        /* Bottom Action Bar */', css_match.group(1) + '\n        /* Bottom Action Bar */')

# Extract HTML
html_match = re.search(r'(        <div class="product-grid">.*?        </div>\n)', idx_content, re.DOTALL)
if html_match:
    prod_content = prod_content.replace('        <div style="height: 50px;"></div> <!-- Placeholder espacamento -->', html_match.group(1))

with open('c:/Users/marcelo/Downloads/deliveryrosas/produto.html', 'w', encoding='utf-8') as f:
    f.write(prod_content)
