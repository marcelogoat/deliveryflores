import re
import json

# Data for new products
gifts = [
    {"id": "117", "name": "CHOLOLATE FERRERO ROCHER COM 3UN", "price": "7,90", "image": "https://www.buquederosas.delivery/cdn/catalog/117.webp?v=2"},
    {"id": "124", "name": "CHOCOLATE FERRERO ROCHER COM 4 UND 50G", "price": "14,90", "image": "https://www.buquederosas.delivery/cdn/catalog/124.webp?v=2"},
    {"id": "244", "name": "Caixa de Chocolate Lindt Lindor - 37g", "price": "17,90", "image": "https://www.buquederosas.delivery/cdn/catalog/244.webp?v=2"},
    {"id": "09de9e61", "name": "Chocolate Ferrero Rocher Branco", "price": "19,90", "image": "https://www.buquederosas.delivery/cdn/upload/09de9e61-0d06-459c-90ec-eacca3f08e67.jpg"},
    {"id": "65367304", "name": "CHOCOLATE FERRERO ROCHER COM 12UND", "price": "19,90", "image": "https://www.buquederosas.delivery/cdn/upload/65367304-3485-481d-9ceb-d4edb8e199f8.webp"},
    {"id": "249", "name": "Lindt Lindor Chocolate ao Leite - 75g", "price": "19,90", "image": "https://www.buquederosas.delivery/cdn/catalog/249.webp?v=2"}
]

# Provide generic descriptions for these chocolates
for g in gifts:
    g['desc'] = f"<p><strong>{g['name']}</strong> - Uma excelente escolha para adicionar um toque doce ao seu presente.</p><br><p>Saboreie a qualidade e a tradição dos melhores chocolates. Ideal para acompanhar flores, demonstrando ainda mais carinho e afeto em momentos especiais.</p><br><p>O pedido é confirmado após o pagamento, e acompanhamos a entrega com você por e-mail e WhatsApp.</p>"

# Update index.html Javascript
html_cards = ""
for g in gifts:
    html_cards += f"""
            <a href="produto.html?id={g['id']}" class="product-card">
                <img src="{g['image']}" alt="{g['name']}" class="product-img">
                <div class="product-details">
                    <div class="product-category">PRESENTES</div>
                    <div class="product-title">{g['name']}</div>
                    <div class="product-bottom">
                        <div class="product-price-list">R$ {g['price']}</div>
                        <button class="add-btn" onclick="event.preventDefault();"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            </a>"""

with open('c:/Users/marcelo/Downloads/deliveryrosas/index.html', 'r', encoding='utf-8') as f:
    idx_content = f.read()

# Replace the innerHTML block in carregarPresentes
old_js = "grid.innerHTML = '<div style=\"grid-column: span 2; text-align: center; padding: 20px; color: #777;\">Os produtos desta categoria serão carregados aqui...</div>';"
new_js = f"grid.innerHTML = `{html_cards}`;"
idx_content = idx_content.replace(old_js, new_js)

with open('c:/Users/marcelo/Downloads/deliveryrosas/index.html', 'w', encoding='utf-8') as f:
    f.write(idx_content)

# Update produto.html to add these new items to the productsData array
with open('c:/Users/marcelo/Downloads/deliveryrosas/produto.html', 'r', encoding='utf-8') as f:
    prod_content = f.read()

# productsData is defined as const productsData = [...];
# We will just replace "];" with ", " + json.dumps(gifts)[1:] + ";"
if "];" in prod_content:
    prod_content = re.sub(r'\];\s*document\.addEventListener', ',' + json.dumps(gifts)[1:] + '; document.addEventListener', prod_content)

with open('c:/Users/marcelo/Downloads/deliveryrosas/produto.html', 'w', encoding='utf-8') as f:
    f.write(prod_content)
