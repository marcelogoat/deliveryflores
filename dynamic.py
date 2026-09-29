import json
import re

products = [
    {"id": "114", "name": "Mini Buquê 3 Rosas Coloridas", "price": "59,90", "image": "https://www.buquederosas.delivery/cdn/catalog/114.webp?v=5"},
    {"id": "113", "name": "Mini Buquê 3 Rosas Brancas", "price": "59,90", "image": "https://www.buquederosas.delivery/cdn/catalog/113.webp?v=5"},
    {"id": "104", "name": "Buquê 2 Rosas Azuis", "price": "59,90", "image": "https://www.buquederosas.delivery/cdn/catalog/104.webp?v=5"},
    {"id": "105", "name": "Buquê 3 Rosas Brancas", "price": "59,90", "image": "https://www.buquederosas.delivery/cdn/catalog/105.webp?v=5"},
    {"id": "107", "name": "Mini Buquê 2 Rosas Brancas", "price": "59,90", "image": "https://www.buquederosas.delivery/cdn/catalog/107.webp?v=5"},
    {"id": "108", "name": "Mini Buquê 2 Rosas Amarelas", "price": "59,90", "image": "https://www.buquederosas.delivery/cdn/catalog/108.webp?v=5"},
    {"id": "457", "name": "Buquê com 3 Rosas Colombianas", "price": "59,90", "image": "https://www.buquederosas.delivery/cdn/catalog/457.webp?v=5"},
    {"id": "110", "name": "Buquê 6 Rosas Amarelas", "price": "79,90", "image": "https://www.buquederosas.delivery/cdn/catalog/110.webp?v=5"},
    {"id": "142", "name": "Buquê delicado com rosas vermelhas e rosas", "price": "69,90", "image": "https://www.buquederosas.delivery/cdn/catalog/142.webp?v=5"},
    {"id": "190", "name": "Buquê de Astromélias Rosas com Embalagem Natural", "price": "59,90", "image": "https://www.buquederosas.delivery/cdn/catalog/190.webp?v=5"},
    {"id": "141", "name": "Buquê elegante com rosas vermelhas e rosas claras", "price": "69,90", "image": "https://www.buquederosas.delivery/cdn/catalog/141.webp?v=5"},
    {"id": "144", "name": "Buquê Encanto Rosé", "price": "79,90", "image": "https://www.buquederosas.delivery/cdn/catalog/144.webp?v=5"},
    {"id": "202", "name": "Buquê com 6 Rosas Colombianas Brancas Naturais – Design Elegante e Delicado", "price": "79,90", "image": "https://www.buquederosas.delivery/cdn/catalog/202.webp?v=5"},
    {"id": "419", "name": "Buquê de Rosas colombianas com Design Exclusivo", "price": "98,90", "image": "https://www.buquederosas.delivery/cdn/catalog/419.webp?v=5"},
    {"id": "100006", "name": "Buquê de 6 Rosas Azuis Naturais Colombianos", "price": "89,90", "image": "https://www.buquederosas.delivery/cdn/catalog/100006.webp?v=5"},
    {"id": "100007", "name": "Buquê Elegante com 6 Rosas Pretas", "price": "129,90", "image": "https://www.buquederosas.delivery/cdn/catalog/100007.webp?v=5"},
    {"id": "109", "name": "Buquê 12 Rosas Amarelas", "price": "139,90", "image": "https://www.buquederosas.delivery/cdn/catalog/109.webp?v=5"},
    {"id": "483", "name": "Buquê Clássico com 12 Rosas Vermelhas Colombianas", "price": "157,90", "image": "https://www.buquederosas.delivery/cdn/catalog/483.webp?v=5"},
    {"id": "212", "name": "Buquê Clássico de Noiva com Rosas Vermelhas", "price": "257,90", "image": "https://www.buquederosas.delivery/cdn/catalog/212.webp?v=5"}
]

def generate_desc(name):
    color = "lindas flores, montadas com muito carinho"
    lower_name = name.lower()
    if "branca" in lower_name: color = "rosas brancas selecionadas, que simbolizam pureza, paz e inocência"
    elif "azul" in lower_name or "azuis" in lower_name: color = "raras rosas azuis, perfeitas para representar mistério, encanto e confiança"
    elif "preta" in lower_name: color = "exclusivas e exóticas rosas pretas, ideais para um presente ousado, misterioso e sofisticado"
    elif "amarela" in lower_name: color = "rosas amarelas super vibrantes, ideais para irradiar alegria, sucesso e amizade"
    elif "vermelha" in lower_name: color = "clássicas rosas vermelhas apaixonantes, o símbolo universal da paixão, desejo e do amor verdadeiro"
    elif "colorida" in lower_name: color = "um mix vibrante e alegre de rosas coloridas para iluminar o dia de qualquer pessoa"
    elif "astromélia" in lower_name: color = "delicadas astromélias, que representam amizade duradoura, lealdade e felicidade"
    elif "rosé" in lower_name or "claras" in lower_name: color = "rosas em tons pastéis e rosé, transmitindo carinho, gratidão e profunda admiração"
    
    desc = f"<p><strong>{name}</strong> montado no dia da entrega por uma floricultura parceira na cidade do destinatário, com flores frescas disponíveis na região.</p><br>"
    desc += f"<p>Este maravilhoso arranjo é composto por {color}. Elas são cuidadosamente selecionadas e preparadas para garantir o máximo de frescor, durabilidade e impacto visual, tornando-se o presente perfeito para homenagear e emocionar quem você ama em qualquer ocasião.</p><br>"
    desc += "<p>O pedido é confirmado após o pagamento, e acompanhamos a entrega com você por e-mail e WhatsApp.</p>"
    return desc

for p in products:
    p['desc'] = generate_desc(p['name'])

# Update index.html to add ?id= to the links
with open('c:/Users/marcelo/Downloads/deliveryrosas/index.html', 'r', encoding='utf-8') as f:
    idx_content = f.read()

for p in products:
    idx_content = idx_content.replace(f'<a href="produto.html" class="product-card">\n                <img src="{p["image"]}" alt="{p["name"]}"', f'<a href="produto.html?id={p["id"]}" class="product-card">\n                <img src="{p["image"]}" alt="{p["name"]}"')

with open('c:/Users/marcelo/Downloads/deliveryrosas/index.html', 'w', encoding='utf-8') as f:
    f.write(idx_content)

# Update produto.html to add ID to links in the bottom grid
with open('c:/Users/marcelo/Downloads/deliveryrosas/produto.html', 'r', encoding='utf-8') as f:
    prod_content = f.read()

for p in products:
    prod_content = prod_content.replace(f'<a href="produto.html" class="product-card">\n                <img src="{p["image"]}" alt="{p["name"]}"', f'<a href="produto.html?id={p["id"]}" class="product-card">\n                <img src="{p["image"]}" alt="{p["name"]}"')

# Inject JavaScript into produto.html to dynamically load content
js_data = json.dumps(products)

js_script = f"""
    <script>
        const productsData = {js_data};
        
        document.addEventListener('DOMContentLoaded', () => {{
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id') || '114'; // Default to first product if no id
            
            const product = productsData.find(p => p.id === id);
            
            if (product) {{
                // Update Breadcrumb
                const bc = document.querySelector('.breadcrumbs span');
                if(bc) bc.textContent = product.name.length > 25 ? product.name.substring(0, 25) + '...' : product.name;
                
                // Update Image
                const img = document.querySelector('.product-main-img');
                if(img) img.src = product.image;
                
                // Update Title
                const title = document.querySelector('.product-title');
                if(title) title.textContent = product.name;
                
                // Update Prices
                const prices = document.querySelectorAll('.product-price, .total-price');
                prices.forEach(el => el.textContent = 'R$ ' + product.price);
                
                // Update Description
                const desc = document.querySelector('.description-content');
                if(desc) desc.innerHTML = product.desc;
                
                // Update page title
                document.title = product.name + " - Buquê de Rosas";
            }}
        }});
    </script>
"""

# Replace existing JS or append it before </body>
if '<script>' in prod_content:
    # Just append before the closing body
    prod_content = prod_content.replace('</body>', js_script + '\n</body>')
else:
    prod_content = prod_content.replace('</body>', js_script + '\n</body>')

with open('c:/Users/marcelo/Downloads/deliveryrosas/produto.html', 'w', encoding='utf-8') as f:
    f.write(prod_content)
