Wallet Watcher -> Atualiza a cada 60s, não precisa atualizar tão frequente, pois o processo é um pouco lento.
Após uma operação de compra em NFT ela deve ser atualizada manualmente.

Coin Watcher -> Atualiza a cada 60s, tempo suficiente para realizar os cálculos e efetuar as compras, é perigoso aumentar para não sobrecarregar a API que usamos.

Wallet -> Podemos utilizar para verificar o saldo manualmente, mais lento que o Wallet Watcher mas mais preciso.
Também possui métodos para fazer trade com BNB/WBNB.