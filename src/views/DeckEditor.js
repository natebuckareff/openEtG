import { Component, createRef, PureComponent } from 'react';
import { connect } from 'react-redux';

import Cards from '../Cards.js';
import Editor from '../Components/Editor.js';
import * as Tutor from '../Components/Tutor.js';
import * as etgutil from '../etgutil.js';
import * as sock from '../sock.js';
import * as store from '../store.js';
import { chain } from '../util.js';

function processDeck(pool, dcode) {
	let mark = 0,
		deck = etgutil.decodedeck(dcode);
	for (let i = deck.length - 1; i >= 0; i--) {
		if (!Cards.Codes[deck[i]]) {
			const index = etgutil.fromTrueMark(deck[i]);
			if (~index) {
				mark = index;
			}
			deck.splice(i, 1);
		}
	}
	deck.sort(Cards.codeCmp).splice(60);
	const cardMinus = Cards.filterDeck(deck, pool, true);
	return { mark, deck, cardMinus };
}

const Qecks = connect(({ user }) => ({ user }))(
	class Qecks extends PureComponent {
		state = {
			setQeck: false,
		};

		render() {
			const buttons = [];
			for (let i = 0; i < 10; i++) {
				buttons.push(
					<input
						type="button"
						key={i}
						value={`${i + 1}`}
						className={`editbtn${
							this.props.user.selectedDeck === this.props.user.qecks[i]
								? ' selectedbutton'
								: ''
						}`}
						onClick={() => {
							if (this.state.setQeck) {
								let swap = -1;
								for (let i = 0; i < 10; i++) {
									if (
										this.props.user.qecks[i] === this.props.user.selectedDeck
									) {
										swap = i;
									}
								}
								if (~swap) {
									sock.userExec('changeqeck', {
										number: swap,
										name: this.props.user.qecks[i],
									});
								}
								sock.userExec('changeqeck', {
									number: i,
									name: this.props.user.selectedDeck,
								});
								this.setState({ setQeck: false });
							} else if (this.props.onClick) {
								this.props.onClick(this.props.user.qecks[i]);
							}
						}}
					/>,
				);
			}
			return (
				<>
					<input
						type="button"
						value="Bind to #"
						className={this.state.setQeck ? 'selectedbutton' : undefined}
						onClick={() => this.setState({ setQeck: !this.state.setQeck })}
						style={{
							position: 'absolute',
							left: '200px',
							top: '8px',
						}}
					/>
					<div
						style={{
							position: 'absolute',
							left: '300px',
							top: '8px',
						}}>
						{buttons}
					</div>
				</>
			);
		}
	},
);

function DeckName({ i, name, deck, onClick }) {
	return (
		<div
			style={{
				position: 'absolute',
				left: `${4 + (i % 6) * 150}px`,
				top: `${32 + Math.floor(i / 6) * 21}px`,
				width: '142px',
				height: '21px',
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap',
			}}>
			<a
				href={`deck/${deck}`}
				target="_blank"
				className={
					'ico ce' + etgutil.fromTrueMark(parseInt(deck.slice(-3), 32))
				}
			/>
			<span onClick={() => onClick(name)}>{name}</span>
		</div>
	);
}

const DeckNames = connect(({ user }) => ({ user }))(function DeckNames({
	user,
	name,
	onClick,
}) {
	let names = Object.keys(user.decks);
	try {
		const rx = name && new RegExp(name);
		if (rx) {
			names = names.filter(name => name.match(rx));
		}
	} catch (_e) {
		names = names.filter(name => ~name.indexOf(name));
	}
	return names
		.sort()
		.map((name, i) => (
			<DeckName
				key={name}
				deck={user.decks[name]}
				name={name}
				i={i}
				onClick={onClick}
			/>
		));
});

const DeckSelector = connect(({ user }) => ({ user }))(
	class DeckSelector extends Component {
		constructor(props) {
			super(props);
			this.state = {
				page: 0,
				name: '',
			};
		}

		setPage = page => this.setState({ page });

		render() {
			return (
				<div
					className="bgbox"
					style={{
						position: 'absolute',
						top: '270px',
						width: '900px',
						height: '330px',
						overflowY: 'auto',
					}}>
					<input
						autoFocus
						placeholder="Name"
						value={this.state.name}
						onChange={e => this.setState({ name: e.target.value })}
						onKeyPress={e => {
							if (
								e.which === 13 &&
								(e.target.value || this.props.user.decks[''])
							) {
								this.props.loadDeck(e.target.value);
							}
						}}
						onClick={e => e.target.setSelectionRange(0, 999)}
						style={{ position: 'absolute', left: '4px', top: '4px' }}
					/>
					{this.state.name && (
						<>
							<input
								type="button"
								value="Create"
								style={{
									position: 'absolute',
									left: '158px',
									top: '4px',
								}}
								onClick={() => {
									this.props.saveDeck(this.props.user.selectedDeck);
									this.props.saveDeck(this.state.name, true);
									this.props.onClose();
								}}
							/>
							<input
								type="button"
								value="Rename"
								style={{ position: 'absolute', left: '258px', top: '4px' }}
								onClick={() => {
									sock.userExec('rmdeck', {
										name: this.props.user.selectedDeck,
									});
									this.props.saveDeck(this.state.name, true);
									this.props.onClose();
								}}
							/>
						</>
					)}
					<input
						type="button"
						value="Exit"
						style={{
							position: 'absolute',
							left: '794px',
							top: '4px',
						}}
						onClick={this.props.onClose}
					/>
					<DeckNames name={this.state.name} onClick={this.props.loadDeck} />
				</div>
			);
		}
	},
);

export default connect(({ user }) => ({
	user,
}))(
	class DeckEditor extends Component {
		constructor(props) {
			super(props);

			const pool = [];
			for (const [code, count] of chain(
				etgutil.iterraw(props.user.pool),
				etgutil.iterraw(props.user.accountbound),
			)) {
				if (Cards.Codes[code]) {
					pool[code] = (pool[code] ?? 0) + count;
				}
			}
			this.deckRef = createRef();
			this.state = {
				pool: pool,
				deckname: '',
				selectedDeck: null,
			};
		}

		static getDerivedStateFromProps(nextProps, prevState) {
			if (nextProps.user.selectedDeck === prevState.selectedDeck) return null;
			return {
				selectedDeck: nextProps.user.selectedDeck,
				...processDeck(prevState.pool, sock.getDeck()),
			};
		}

		componentDidMount() {
			this.deckRef.current.setSelectionRange(0, 999);
			document.addEventListener('keydown', this.onkeydown);
		}

		componentWillUnmount() {
			document.removeEventListener('keydown', this.onkeydown);
		}

		onkeydown = e => {
			if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')
				return;
			const kc = e.which,
				ch = e.key ?? String.fromCharCode(kc);
			let chi = '1234567890'.indexOf(ch);
			if (~chi) {
				this.loadDeck(this.props.user.qecks[chi]);
			}
		};

		currentDeckCode() {
			return (
				etgutil.encodedeck(this.state.deck) +
				etgutil.toTrueMarkSuffix(this.state.mark)
			);
		}

		saveDeck = (name, force) => {
			if (this.state.deck.length === 0) {
				sock.userExec('rmdeck', { name });
				return;
			}
			const dcode = this.currentDeckCode();
			if (dcode !== this.props.user.decks[name]) {
				sock.userExec('setdeck', { d: dcode, name });
			} else if (force) sock.userExec('setdeck', { name });
		};

		loadDeck = name => {
			this.saveDeck(this.props.user.selectedDeck);
			sock.userExec('setdeck', { name });
		};

		deckModeToggle = () => this.setState({ deckmode: !this.state.deckmode });
		deckModeOff = () => this.setState({ deckmode: false });

		render() {
			return (
				<>
					<Editor
						cards={Cards}
						deck={this.state.deck}
						mark={this.state.mark}
						pool={this.state.pool}
						cardMinus={this.state.cardMinus}
						setDeck={deck => {
							deck.sort(Cards.codeCmp);
							const cardMinus = Cards.filterDeck(deck, this.state.pool, true);
							this.setState({ deck, cardMinus });
						}}
						setMark={mark => this.setState({ mark })}
					/>
					<Tutor.Tutor x={4} y={220} panels={Tutor.Editor} />
					<label style={{ position: 'absolute', left: '536px', top: '238px' }}>
						Deck &nbsp;
						<input
							autoFocus
							value={this.currentDeckCode()}
							onChange={e => {
								let dcode = e.target.value.trim();
								if (~dcode.indexOf(' ')) {
									const dsplit = dcode.split(' ').sort();
									dcode = '';
									let i = 0;
									while (i < dsplit.length) {
										const di = dsplit[i],
											i0 = i++;
										while (i < dsplit.length && dsplit[i] === di) {
											i++;
										}
										dcode += etgutil.encodeCount(i - i0);
										dcode += di;
									}
								}
								this.setState(processDeck(this.state.pool, dcode));
							}}
							ref={this.deckRef}
							onClick={e => {
								e.target.setSelectionRange(0, 999);
							}}
						/>
					</label>
					<div style={{ position: 'absolute', top: '8px', left: '8px' }}>
						{this.props.user.selectedDeck}
					</div>
					<input
						type="button"
						value="Decks"
						onClick={this.deckModeToggle}
						style={{
							position: 'absolute',
							left: '8px',
							top: '58px',
						}}
					/>
					<input
						type="button"
						value="Revert"
						onClick={() =>
							this.setState(processDeck(this.state.pool, sock.getDeck()))
						}
						style={{ position: 'absolute', left: '8px', top: '162px' }}
					/>
					<input
						type="button"
						value="Exit"
						onClick={() => {
							this.saveDeck(this.props.user.selectedDeck, true);
							this.props.dispatch(store.doNav(import('../views/MainMenu.js')));
						}}
						style={{ position: 'absolute', left: '8px', top: '110px' }}
					/>
					<Qecks onClick={this.loadDeck} />
					{this.state.deckmode && (
						<DeckSelector
							loadDeck={this.loadDeck}
							saveDeck={this.saveDeck}
							onClose={this.deckModeOff}
						/>
					)}
				</>
			);
		}
	},
);
