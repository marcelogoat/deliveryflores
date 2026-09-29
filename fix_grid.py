with open('c:/Users/marcelo/Downloads/deliveryrosas/index.html', 'r', encoding='utf-8') as f:
    idx_content = f.read()

# Extract from index.html
start_marker = '        <!-- Product Grid -->\n        <div class="product-grid">'
end_marker = '        </div>\n\n    </div>\n\n    <!-- Bottom Navigation -->'

if start_marker in idx_content and end_marker in idx_content:
    grid_html = idx_content.split(start_marker)[1].split(end_marker)[0]
    grid_html = start_marker + grid_html + '        </div>\n'
else:
    grid_html = "ERROR FINDING GRID"
    print("Error finding grid in index")

with open('c:/Users/marcelo/Downloads/deliveryrosas/produto.html', 'r', encoding='utf-8') as f:
    prod_content = f.read()

# The broken part in produto.html is:
#         <div class="divider-title">Da mesma categoria</div>
#         <div class="product-grid">
# ...
#                     </div>
# 
# 
#     </div>
# 
#     <!-- Bottom Action Bar (Floating) -->

start_replace = '        <div class="divider-title">Da mesma categoria</div>'
end_replace = '    <!-- Bottom Action Bar (Floating) -->'

if start_replace in prod_content and end_replace in prod_content:
    before = prod_content.split(start_replace)[0]
    after = prod_content.split(end_replace)[1]
    
    new_content = before + start_replace + '\n' + grid_html + '\n    </div>\n\n    <!-- Bottom Action Bar (Floating) -->' + after
    
    with open('c:/Users/marcelo/Downloads/deliveryrosas/produto.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
else:
    print("Error finding boundaries in produto.html")
