Wallet Watcher:
	1. Atualiza a cada 60s, não precisa atualizar tão frequente, pois o processo é um pouco lento.
	2. Após uma operação de compra em NFT ela deve ser atualizada manualmente (update).

Coin Watcher:
	1. Atualiza a cada 60s, tempo suficiente para realizar os cálculos e efetuar as compras.
	2. É perigoso aumentar o tempo de refresh pois pode sobrecarregar a API que usamos.

Wallet: 
	1. Só utilize para trade BNB/WBNB, para verificar o saldo utilize a Wallet Watcher.

Marketplace:
	1. Não é mais responsável por verificar o saldo.
	2. *Falta estimar o gas corretamente
	3. *Falta o método de vender o NFT


BUG: Mesmo comprando ta mostrando que falhou

IMP: Saldo mínimo para rodar
IMP: Deixar constantes mais fáceis de trocar

OBS: Não ignorar a taxa de 4.15% de vender no mercado e nem o valor do gás