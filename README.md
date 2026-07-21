# VOXFORGE

Boutique en ligne d'objets imprimés en 3D.

## État actuel
- Site 100% fonctionnel côté visiteur (catalogue, filtres, panier, tunnel de commande, compte, admin)
- Les données (produits, panier, commandes) sont stockées dans le navigateur (localStorage) : elles ne sont pas encore partagées entre visiteurs
- Le paiement est simulé

## Prochaines étapes
1. Brancher une base de données Supabase pour que le stock et les produits soient partagés entre tous les visiteurs
2. Brancher Stripe Checkout pour accepter de vrais paiements
3. Déployer sur Vercel avec un nom de domaine personnalisé
