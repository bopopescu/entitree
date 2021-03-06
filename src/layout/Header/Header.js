import React, { useState } from "react";
import {
  Navbar,
  Container,
  DropdownButton,
  Dropdown,
  Button,
  Nav,
} from "react-bootstrap";
import { FiSliders } from "react-icons/fi";
import ReactGA from "react-ga";
import { EXAMPLES } from "../../constants/examples";
import "./Header.scss";
import Logo from "../../components/Logo/Logo";
import Settings from "../../modals/Settings/Settings";
import { SITE_TITLE } from "../../constants/meta";

export default function Header({ simple }) {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const openSettingsModal = () => {
    ReactGA.modalview("settings");
    setShowSettingsModal(true);
  };

  const openExampleLink = (e) => {
    ReactGA.event({
      category: "Examples",
      action: "Clicked on example",
      label: e.target.href,
    });
  };

  return (
    <Navbar className="Header" bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand href="/">
          <Logo /> {SITE_TITLE}
        </Navbar.Brand>
        {!simple && (
          <DropdownButton
            title="Examples"
            variant="info"
            size="sm"
            className="examplesButton"
          >
            {EXAMPLES.map(({ name, href }) => (
              <Dropdown.Item key={name} href={href} onClick={openExampleLink}>
                {name}
              </Dropdown.Item>
            ))}
          </DropdownButton>
        )}
        {!simple && (
          <Nav className="ml-auto">
            <Button
              className="settingsButton"
              variant="none"
              onClick={openSettingsModal}
            >
              settings
              <FiSliders className="ml-2" />
            </Button>
            <Settings
              show={showSettingsModal}
              hideModal={() => setShowSettingsModal(false)}
            />
          </Nav>
        )}
      </Container>
    </Navbar>
  );
}
