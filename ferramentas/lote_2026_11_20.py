"""Lugares novos de 20/11/2026 (9 posts do TikTok). Gera dados/novos/*.json."""
import json, os
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(RAIZ, "dados", "novos"); os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
TT = "https://www.tiktok.com/"
def F(n, u): return {"nome": n, "url": u}
V1 = TT + "@matthcordeiro_/video/7697384455337479444"
NIC = TT + "@nicolespessi/photo/7623496636412529940"
BIA = TT + "@biajorg/video/7625807615792172308"
n = [0]
def P(id, nome, tipo, bairro, end, lat, lng, preco, tiktok, porque, titulo, fina, pars, pedir=None, atencao=None, horario=None, nota=None, fontes=()):
    n[0] += 1
    post = {"titulo": titulo, "linhafina": fina, "paragrafos": pars, "pesquisado": "2026-11-20", "fontes": list(fontes) + [F("Vídeo no TikTok", tiktok)]}
    if pedir: post["pedir"] = pedir
    if atencao: post["atencao"] = atencao
    if horario: post["horario"] = horario
    if nota: post["nota_publica"] = nota
    d = {"nome": nome, "tipo": tipo, "bairro": bairro, "endereco": end, "lat": lat, "lng": lng, "preco": preco, "status": "quero",
         "tiktok": tiktok, "porque": porque, "visita": None, "post": post, "criado": "2026-11-20T03:%02d:00Z" % n[0]}
    json.dump(d, open(os.path.join(OUT, id + ".json"), "w", encoding="utf-8"), ensure_ascii=False)

P("opera-restaurante-escola", "Ópera Restaurante Escola", "Restaurante-escola", "Anhangabaú", "Rua Formosa, 467", -23.54717, -46.6386, 1, V1,
  "Comida de chef bem servida por R$ 35, num projeto que prepara pessoas para trabalhar em cozinha.",
  "Ópera: prato de chef por R$ 35 num restaurante-escola", "Comida bem servida no Anhangabaú, num projeto que forma gente para o mercado de trabalho.",
  ["O Ópera é um restaurante-escola perto do Vale do Anhangabaú. Segundo o vídeo, serve comida de chef, bem servida, por cerca de R$ 35.", "Além do preço, o que chama atenção é o projeto: o restaurante capacita pessoas para trabalhar em cozinha e salão. Não achei o lugar em guias, então o que se sabe vem do vídeo; vale olhar o Instagram @opera.restauranteescola antes de ir."],
  atencao=["Pouca informação fora do vídeo", "O ponto no mapa marca a Rua Formosa, sem o número exato"])
P("nyko-lamen", "Nyko Lamen", "Japonesa (lámen)", "Liberdade", "Rua Barão de Iguape, 158 (Galeria Liberdade Side Street)", -23.55839, -46.63543, 1, V1,
  "Para fugir das filas da Liberdade, com o guabao de carne a R$ 30.",
  "Nyko Lamen: lámen e guabao sem a fila da Liberdade", "Dentro de uma galeria da Barão de Iguape, com o guabao de carne desmanchando.",
  ["O Nyko Lamen fica dentro da Galeria Liberdade Side Street, na Rua Barão de Iguape. A dica do vídeo é justamente escapar das filas enormes dos lámens mais famosos do bairro.", "O destaque é o guabao, o pãozinho cozido no vapor recheado, de carne bovina (R$ 30), com massa macia e carne que desmancha."],
  pedir=["Guabao de carne", "Lámen"], fontes=[])
P("currys-pinheiros", "Curry's Culinária Indiana", "Indiana", "Pinheiros", "Rua Henrique Schaumann, 667", -23.56356, -46.67829, 2, V1,
  "Indiano tão autêntico que a própria comunidade indiana frequenta. Peça os caldos e mergulhe o pão com as mãos.",
  "Curry's: o indiano que a comunidade indiana frequenta", "Curries, naan no forno tandoor e muita opção vegetariana em Pinheiros.",
  ["O Curry's é uma pequena rede de comida indiana com casas em Pinheiros, na Liberdade e no Brooklin. O vídeo diz que é tão autêntico que a própria comunidade indiana bate ponto lá.", "O cardápio tem vários curries, naan assado no forno tandoor e muitas opções vegetarianas e veganas. A dica é pedir os caldos e mergulhar o pão direto, com as mãos."],
  pedir=["Curries com naan", "Garlic naan", "Samosas"], fontes=[F("BaresSP", "https://www.baressp.com.br/restaurantes/indianos/currys-pinheiros"), F("99Food", "https://99app.com/99food/sao-paulo/currys-pinheiros/5764608309567688433/")])
P("shawarmoso", "Shawarmoso", "Árabe (shawarma)", "Mooca", "Rua do Oratório, 625", -23.55879, -46.59507, 1, TT + "@dicas.em.sp/video/7685420754636164370",
  "Apareceu numa série que procura o melhor shawarma de São Paulo.",
  "Shawarmoso: candidato a melhor shawarma de SP, na Mooca", "Terceiro episódio de uma série que caça o melhor shawarma da cidade.",
  ["O Shawarmoso aparece no terceiro episódio de uma série do TikTok que procura o melhor shawarma de São Paulo. Fica na Rua do Oratório, na Mooca.", "Ainda não aparece em guias, então o vídeo é a melhor referência."], atencao=["Pouca informação fora do vídeo"])
P("paradiso-bar-e-cucina", "Paradiso Bar e Cucina", "Pizza (estilo Chicago)", "Paraíso", "Rua Apeninos, 747", -23.57404, -46.63925, 3, TT + "@ondeiremsp_/video/7686662337847217415",
  "Um castelo medieval no meio de SP que serve pizza recheada de Chicago (o vídeo foi a convite da casa).",
  "Paradiso: pizza recheada de Chicago num castelo medieval", "Decoração de castelo, armadura na parede e a stuffed pizza que serve 4 ou 5 pessoas.",
  ["O Paradiso é um bar e cozinha italiana com tema medieval no Paraíso: parece um castelo, e tem até armadura exposta. A estrela é a stuffed pizza, a pizza alta e muito recheada de Chicago.", "No vídeo, a pizza grande de filé mignon com quatro queijos serve de 4 a 5 pessoas e custa R$ 238,90. O cardápio também tem petiscos, massas e pizzas comuns."],
  pedir=["Stuffed pizza de filé mignon ao quatro queijos"], atencao=["O vídeo foi feito a convite da casa", "A pizza grande é para dividir em 4 ou 5"],
  fontes=[F("BaresSP", "https://baressp.com.br/restaurantes/cozinha-variada/paradiso-bar-e-cucina"), F("Wanderlog", "https://wanderlog.com/place/details/8084244/paradiso-747-pizza--parrilla")])
P("merenda-da-cidade", "Merenda da Cidade", "Brasileira", "República", "Rua Epitácio Pessoa, 98", -23.54603, -46.64579, 1, TT + "@ola_soualidia/video/7661636913463397652",
  "O que dá para comer com menos de R$ 50.",
  "Merenda da Cidade: almoço por menos de R$ 50 no centro", "Só no almoço, das 12h às 16h.",
  ["O vídeo mostra o que dá para comer com menos de R$ 50 no Merenda da Cidade, no centro, perto da Vila Buarque. Funciona só no almoço.", "Não achei o lugar em guias, então vale conferir o cardápio e os preços antes."],
  horario="12h–16h", atencao=["Só almoço", "O ponto no mapa marca a rua, sem o número exato"])
P("caral-gastrobar", "Caral Gastrobar & Coffee", "Peruana", "Bom Retiro", "Rua Três Rios, 218 A", -23.52933, -46.63624, 2, TT + "@nobukahi/video/7655434730627779847",
  "Peruano fusion no Bom Retiro, com toda a equipe da cozinha peruana.",
  "Caral: cozinha peruana que se mistura com o mundo, no Bom Retiro", "Lomo saltado, chicharrón de pollo e tiramisù, feitos por uma cozinha toda peruana.",
  ["O Caral faz comida peruana misturada com outras cozinhas. Segundo o vídeo, toda a equipe da cozinha é peruana, e a proposta junta tradição e pratos cosmopolitas.", "No vídeo aparecem o lomo saltado, o chicharrón de pollo e um tiramisù. No aplicativo de entrega também há chaufa, o arroz frito peruano-chinês, chicha morada e bolo tres leches."],
  pedir=["Lomo saltado", "Chicharrón de pollo", "Chicha morada"], fontes=[F("99Food", "https://99app.com/99food/sao-paulo/caral-gastrobar-coffee/5764610916721888771/")])
P("hz-restaurante", "HZ Restaurante", "Chinesa", "Aclimação", "Rua Apeninos, 553", -23.57234, -46.63911, 1, TT + "@nobukahi/video/7643623973724376338",
  "Frango empanado com molho de gengibre, barato, num restaurante de família perto da estação Vergueiro.",
  "HZ: o chinês de família onde se pede pelo número", "Frango empanado com gengibre e porções generosas perto do metrô Vergueiro.",
  ["O HZ é um restaurante chinês simples, de família, perto da estação Vergueiro. A dica do vídeo é pedir pelo número do cardápio; o pedido do autor foi o 12, o frango empanado com molho de gengibre.", "Nas avaliações, os pratos são elogiados pelo preço justo e pelas porções grandes."],
  pedir=["Nº 12: frango empanado com molho de gengibre"], fontes=[F("Wanderlog", "https://wanderlog.com/place/details/3631658/hz-restaurante")])
P("jesuino-brilhante", "Jesuíno Brilhante", "Nordestina", "Pinheiros", "Rua Arruda Alvim, 187", -23.55403, -46.67497, 2, NIC,
  "Restaurante brasileiro na lista de lugares bons por até R$ 60 por pessoa.",
  "Jesuíno Brilhante: o sertão potiguar no meio de Pinheiros", "Carne de sol do Seridó e cocada cremosa com queijo coalho.",
  ["O Jesuíno Brilhante leva o nome de um cangaceiro famoso da cidade do dono, no Rio Grande do Norte, e faz comida do sertão potiguar.", "A carne de sol vem de Caicó e da região do Seridó. Nas sobremesas, os destaques são a cocada cremosa e o doce de caju-ameixa, servidos com queijo coalho. Funciona no almoço."],
  pedir=["Carne de sol", "Cocada cremosa com queijo coalho"], horario="Seg–sáb 11h30–15h (confirme)",
  fontes=[F("Catraca Livre", "https://catracalivre.com.br/gastronomia/jesuino-brilhante-achados-elo/"), F("Fundação Perseu Abramo", "https://fpabramo.org.br/o-brilhante-do-semiarido-encravado-no-coracao-de-sampa/")])
P("curry-natural", "Curry Natural", "Indiana vegana", "Ipiranga", "Rua Dom Lucas Obes, 242", -23.58943, -46.60473, 2, NIC,
  "Indiano vegano na lista de lugares bons por até R$ 60 por pessoa.",
  "Curry Natural: comida indiana toda vegana no Ipiranga", "Vadas, samosas, tikka masala e curries com chapati.",
  ["O Curry Natural faz comida indiana inteiramente vegana: vadas, samosas, tikka masala e vários curries, servidos com chapati e arroz.", "No aplicativo de entrega, o tikka masala de grão-de-bico sai por cerca de R$ 46."],
  pedir=["Tikka masala de grão-de-bico", "Samosas"], fontes=[F("Spinach Guide", "https://spinach.guide/venues/curry-natural-176117/"), F("99Food", "https://99app.com/99food/sao-paulo/curry-natural/5764608999266454079/")])
P("aska-lamen", "Aska Lamen", "Japonesa (lámen)", "Liberdade", "Rua Barão de Iguape, 260", -23.55835, -46.63443, 1, NIC,
  "Lámen na lista de lugares bons por até R$ 60 por pessoa.",
  "Aska: o lámen mais tradicional da Liberdade", "Fila constante e fama de um dos melhores lámens de São Paulo.",
  ["O Aska é considerado por muita gente o lámen mais tradicional de São Paulo, com fila quase sempre. Antes ficava na Rua Galvão Bueno; os guias mais recentes e o post dão a Rua Barão de Iguape.", "Já foi conhecido por aceitar só dinheiro, então vale levar."],
  atencao=["Fila frequente", "Leve dinheiro, por via das dúvidas"], horario="Ter–dom 11h–14h e 18h–21h",
  fontes=[F("São Paulo Secreto", "https://saopaulosecreto.com/en/lamen-in-liberdade/"), F("Guia do metrô Japão-Liberdade", "https://comerciosaopaulo.com.br/guia-da-estacao-japao-liberdade-linha-1-azul-do-metro-sp/")])
P("rinconcito-peruano", "Rinconcito Peruano", "Peruana", "Santa Ifigênia", "Rua Aurora, 451", -23.54025, -46.64057, 2, NIC,
  "Peruano na lista de lugares bons por até R$ 60 por pessoa.",
  "Rinconcito Peruano: o ceviche do centro antes da moda do ceviche", "Casa do peruano Edgar Villar, que chegou de Lima em 2000.",
  ["O Rinconcito Peruano foi criado por Edgar Villar, que chegou de Lima em 2000 e abriu o restaurante no centro. Era o peruano de São Paulo bem antes da moda do ceviche.", "Os destaques são o ceviche clássico, o pescado a lo macho e o lomo saltado."],
  pedir=["Ceviche clássico", "Pescado a lo macho", "Lomo saltado"], fontes=[F("BaresSP", "https://baressp.com.br/restaurantes/peruanos/rinconcito-peruano-aurora"), F("Culture Trip", "https://theculturetrip.com/south-america/brazil/articles/where-to-try-the-best-ceviche-in-sao-paulo")])
P("taqueria-atzi", "Taqueria Atzi", "Mexicana", "Vila Madalena", "Rua Mourato Coelho, 1233", -23.5574, -46.69198, 2, NIC,
  "Mexicano na lista de lugares bons por até R$ 60 por pessoa.",
  "Atzi: tacos de Oaxaca com cara de taqueria da Cidade do México", "Al pastor, chicharrón e música latina na Mourato Coelho.",
  ["A Taqueria Atzi é de Luana Sabino e Eduardo Ortiz e se inspira nas taquerias modernas da Cidade do México. As raízes de Oaxaca da família aparecem no chicharrón e no al pastor.", "As avaliações são muito boas, e há quem diga que é o melhor mexicano da cidade. Os tacos montados, de al pastor com queijo derretido, são um dos pedidos mais conhecidos."],
  pedir=["Tacos al pastor", "Tacos montados", "Chicharrón"], fontes=[F("Wanderlog", "https://wanderlog.com/place/details/9599613"), F("99Food", "https://99app.com/99food/sao-paulo/atzi-taqueria/5764609136860594464/")])
P("tandoor", "Tandoor", "Indiana", "Paraíso", "Rua Mário Amaral, 559", -23.57488, -46.64721, 2, BIA,
  "Nota 9,4 de 10: espaço divino, tempero delicioso, R$ 152 para duas pessoas.",
  "Tandoor: um dos indianos mais antigos de São Paulo", "Na ativa desde 1990, hoje no Paraíso.",
  ["O Tandoor funciona desde 1990 e é um dos restaurantes indianos mais antigos da cidade. Já passou por outros endereços e hoje fica no Paraíso.", "No vídeo, a autora dá nota 9,4: elogia o espaço e o tempero, e a conta saiu R$ 152 para duas pessoas."],
  nota="9,4/10 no vídeo", fontes=[F("BaresSP", "https://baressp.com.br/restaurantes/indianos/tandoor"), F("São Paulo Secreto", "https://saopaulosecreto.com/restaurantes-indianos-em-sp/")])
P("izakaya-cocoro", "Izakaya Cocoro", "Japonesa (izakaya)", "Vila Mariana", "Rua Cubatão, 138", -23.57459, -46.64429, 2, BIA,
  "Nota 8,9 de 10: donburi de frutos do mar nota 1000 e um missoshiro que dá vontade de voltar. R$ 160 para duas pessoas.",
  "Izakaya Cocoro: donburi de frutos do mar na Vila Mariana", "Cardápio enorme e um missoshiro que ficou na memória.",
  ["O Cocoro é um izakaya na Vila Mariana. No vídeo, a autora dá nota 8,9, diz que o donburi de frutos do mar é \"nota 1000\", que o cardápio é enorme e que ama o missoshiro. A conta saiu R$ 160 para duas pessoas.", "Achei pouca coisa em guias, e uma das listagens é confusa, então confirme o endereço e o horário antes de ir."],
  pedir=["Donburi de frutos do mar", "Missoshiro"], nota="8,9/10 no vídeo", atencao=["Confirme se está aberto antes de ir", "O ponto no mapa marca a Rua Cubatão, sem o número exato"],
  fontes=[F("BenditoGuia", "https://www.benditoguia.com.br/empresa/izakaya-cocoro-vila-mariana-sao-paulo-sp")])
print(n[0], "lugares escritos em dados/novos")
