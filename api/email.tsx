import * as React from "react";
import { Html, Head, Body, Container, Text } from "@react-email/components";

export function Email() {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Text>Hello </Text>
          <Text>This is a test email</Text>
        </Container>
      </Body>
    </Html>
  );
}
