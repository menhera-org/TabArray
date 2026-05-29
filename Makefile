all:
	npm run build

dev:
	npm run dev

clean:
	npm run clean

icons:
	./shellscripts/update-contextual-identities-icons.sh

amo-html:
	./shellscripts/build-amo-descriptions.sh
